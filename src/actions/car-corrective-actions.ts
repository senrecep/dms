"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  correctiveActionRequests,
  carCorrectiveActions,
  carActionTeam,
  carActivityLogs,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { classifyError, type ActionResult } from "@/lib/errors";
import { enqueueNotification } from "@/lib/queue";

// --- Helpers ---

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

const STATUS_ORDER = [
  "OPEN",
  "ROOT_CAUSE_ANALYSIS",
  "IMMEDIATE_ACTION",
  "PLANNED_ACTION",
  "ACTION_RESULTS",
  "PENDING_CLOSURE",
  "CLOSED",
] as const;

function isStatusAtLeast(current: string, required: string): boolean {
  const currentIdx = STATUS_ORDER.indexOf(current as (typeof STATUS_ORDER)[number]);
  const requiredIdx = STATUS_ORDER.indexOf(required as (typeof STATUS_ORDER)[number]);
  if (currentIdx === -1 || requiredIdx === -1) return false;
  return currentIdx >= requiredIdx;
}

// --- createCorrectiveAction ---

const createCorrectiveActionSchema = z.object({
  carId: z.string().min(1),
  description: z.string().min(1).max(5000),
  ownerId: z.string().min(1),
  targetDate: z.string().min(1),
  teamMemberIds: z.array(z.string()).optional(),
});

export async function createCorrectiveAction(
  carId: string,
  data: {
    description: string;
    ownerId: string;
    targetDate: string;
    teamMemberIds?: string[];
  },
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const parsed = createCorrectiveActionSchema.safeParse({ carId, ...data });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const car = await db.query.correctiveActionRequests.findFirst({
      where: and(
        eq(correctiveActionRequests.id, carId),
        eq(correctiveActionRequests.isDeleted, false),
      ),
    });

    if (!car) throw new Error("CAR not found");

    if (!isStatusAtLeast(car.status, "PLANNED_ACTION")) {
      throw new Error("CAR is not in a valid status for corrective actions");
    }

    const actionId = nanoid();
    const targetDate = new Date(data.targetDate);

    await db.insert(carCorrectiveActions).values({
      id: actionId,
      carId,
      description: data.description.trim(),
      ownerId: data.ownerId,
      targetDate,
      status: "OPEN",
      createdById: userId,
    });

    // Insert team members
    if (data.teamMemberIds && data.teamMemberIds.length > 0) {
      const uniqueTeamMemberIds = [...new Set(data.teamMemberIds)];
      await db.insert(carActionTeam).values(
        uniqueTeamMemberIds.map((memberId) => ({
          id: nanoid(),
          correctiveActionId: actionId,
          userId: memberId,
        })),
      );
    }

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId,
      correctiveActionId: actionId,
      userId,
      action: "ACTION_ADDED",
      details: {
        description: data.description.trim(),
        ownerId: data.ownerId,
        targetDate: data.targetDate,
      },
    });

    // Notify owner if different from current user
    if (data.ownerId !== userId) {
      await enqueueNotification({
        userId: data.ownerId,
        type: "REMINDER",
        titleKey: "carActionAssigned",
        messageParams: { carCode: car.carCode },
      });
    }

    revalidatePath(`/car/${carId}`);
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- updateCorrectiveAction ---

const updateCorrectiveActionSchema = z.object({
  description: z.string().min(1).max(5000).optional(),
  ownerId: z.string().min(1).optional(),
  targetDate: z.string().min(1).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
});

export async function updateCorrectiveAction(
  actionId: string,
  data: {
    description?: string;
    ownerId?: string;
    targetDate?: string;
    status?: string;
  },
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const parsed = updateCorrectiveActionSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const action = await db.query.carCorrectiveActions.findFirst({
      where: and(
        eq(carCorrectiveActions.id, actionId),
        eq(carCorrectiveActions.isDeleted, false),
      ),
    });

    if (!action) throw new Error("Corrective action not found");

    const car = await db.query.correctiveActionRequests.findFirst({
      where: and(
        eq(correctiveActionRequests.id, action.carId),
        eq(correctiveActionRequests.isDeleted, false),
      ),
    });

    if (!car) throw new Error("CAR not found");

    const updateData: Record<string, unknown> = {};
    if (data.description !== undefined)
      updateData.description = data.description.trim();
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
    if (data.targetDate !== undefined)
      updateData.targetDate = new Date(data.targetDate);
    if (data.status !== undefined)
      updateData.status = data.status as typeof action.status;

    await db
      .update(carCorrectiveActions)
      .set(updateData)
      .where(eq(carCorrectiveActions.id, actionId));

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId: action.carId,
      correctiveActionId: actionId,
      userId,
      action: "ACTION_UPDATED",
      details: { ...data },
    });

    revalidatePath(`/car/${action.carId}`);
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- completeCorrectiveAction ---

const completeCorrectiveActionSchema = z.object({
  results: z.string().min(1).max(5000),
  cost: z.number().min(0).optional(),
});

export async function completeCorrectiveAction(
  actionId: string,
  data: {
    results: string;
    cost?: number;
  },
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const parsed = completeCorrectiveActionSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const action = await db.query.carCorrectiveActions.findFirst({
      where: and(
        eq(carCorrectiveActions.id, actionId),
        eq(carCorrectiveActions.isDeleted, false),
      ),
    });

    if (!action) throw new Error("Corrective action not found");

    await db
      .update(carCorrectiveActions)
      .set({
        status: "COMPLETED",
        completedAt: new Date(),
        results: data.results.trim(),
        cost: data.cost !== undefined ? String(data.cost) : undefined,
      })
      .where(eq(carCorrectiveActions.id, actionId));

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId: action.carId,
      correctiveActionId: actionId,
      userId,
      action: "ACTION_COMPLETED",
      details: {
        results: data.results.trim(),
        cost: data.cost,
      },
    });

    revalidatePath(`/car/${action.carId}`);
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- deleteCorrectiveAction (soft delete) ---

export async function deleteCorrectiveAction(
  actionId: string,
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const action = await db.query.carCorrectiveActions.findFirst({
      where: and(
        eq(carCorrectiveActions.id, actionId),
        eq(carCorrectiveActions.isDeleted, false),
      ),
    });

    if (!action) throw new Error("Corrective action not found");

    await db
      .update(carCorrectiveActions)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
      })
      .where(eq(carCorrectiveActions.id, actionId));

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId: action.carId,
      correctiveActionId: actionId,
      userId,
      action: "DELETED",
      details: { actionId },
    });

    revalidatePath(`/car/${action.carId}`);
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- addTeamMember ---

export async function addTeamMember(
  actionId: string,
  userId: string,
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const actorId = session.user.id;

    const action = await db.query.carCorrectiveActions.findFirst({
      where: and(
        eq(carCorrectiveActions.id, actionId),
        eq(carCorrectiveActions.isDeleted, false),
      ),
    });

    if (!action) throw new Error("Corrective action not found");

    await db.insert(carActionTeam).values({
      id: nanoid(),
      correctiveActionId: actionId,
      userId,
    });

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId: action.carId,
      correctiveActionId: actionId,
      userId: actorId,
      action: "TEAM_MEMBER_ADDED",
      details: { userId },
    });

    revalidatePath(`/car/${action.carId}`);
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- removeTeamMember ---

export async function removeTeamMember(
  actionId: string,
  userId: string,
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const actorId = session.user.id;

    const action = await db.query.carCorrectiveActions.findFirst({
      where: and(
        eq(carCorrectiveActions.id, actionId),
        eq(carCorrectiveActions.isDeleted, false),
      ),
    });

    if (!action) throw new Error("Corrective action not found");

    await db
      .delete(carActionTeam)
      .where(
        and(
          eq(carActionTeam.correctiveActionId, actionId),
          eq(carActionTeam.userId, userId),
        ),
      );

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId: action.carId,
      correctiveActionId: actionId,
      userId: actorId,
      action: "TEAM_MEMBER_REMOVED",
      details: { userId },
    });

    revalidatePath(`/car/${action.carId}`);
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- getCorrectiveActions ---

export async function getCorrectiveActions(carId: string) {
  await getSession();
  return db.query.carCorrectiveActions.findMany({
    where: and(
      eq(carCorrectiveActions.carId, carId),
      eq(carCorrectiveActions.isDeleted, false),
    ),
    with: {
      owner: {
        columns: { id: true, name: true, email: true },
      },
      createdBy: {
        columns: { id: true, name: true, email: true },
      },
      team: {
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
        },
      },
    },
  });
}
