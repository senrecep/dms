"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  correctiveActionRequests,
  carRootCauseAnalyses,
  carImmediateActions,
  carCorrectiveActions,
  carActivityLogs,
  carNotificationUsers,
  userPermissions,
} from "@/lib/db/schema";
import { and, eq, ne, count } from "drizzle-orm";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { classifyError, type ActionResult } from "@/lib/errors";
import { enqueueNotification } from "@/lib/queue";
import { isValidTransition, getNextStatus } from "@/lib/car/workflow";

// --- Helpers ---

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

async function hasPermission(
  userId: string,
  permission: string,
): Promise<boolean> {
  const result = await db
    .select({ id: userPermissions.id })
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.permission, permission),
      ),
    )
    .limit(1);
  return result.length > 0;
}

// --- advanceCarStatus: Move to next linear stage ---

export async function advanceCarStatus(
  carId: string,
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const role = (session.user as { role?: string }).role;

    const car = await db.query.correctiveActionRequests.findFirst({
      where: and(
        eq(correctiveActionRequests.id, carId),
        eq(correctiveActionRequests.isDeleted, false),
      ),
    });

    if (!car) throw new Error("CAR not found");

    const nextStatus = getNextStatus(car.status);
    if (!nextStatus) throw new Error("No valid next status");

    // Authorization: only assignee or ADMIN
    const isAssignee = car.assigneeId === userId;
    const isAdmin = role === "ADMIN";

    if (!isAssignee && !isAdmin) {
      throw new Error("Only the assignee or admin can advance the status");
    }

    // Validate prerequisites for the target status
    await validatePrerequisites(carId, car.status, nextStatus);

    // Perform transition
    await db
      .update(correctiveActionRequests)
      .set({ status: nextStatus as typeof car.status })
      .where(eq(correctiveActionRequests.id, carId));

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId,
      userId,
      action: "STATUS_CHANGED",
      details: { from: car.status, to: nextStatus },
    });

    // Notify relevant users
    await notifyStatusChange(carId, car, nextStatus, userId);

    revalidatePath(`/car/${carId}`);
    revalidatePath("/car/list");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- closeCar: KG approval (PENDING_CLOSURE -> CLOSED) ---

export async function closeCar(
  carId: string,
  note: string,
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    // Check CLOSE_CAR permission
    const canClose = await hasPermission(userId, "CLOSE_CAR");
    const role = (session.user as { role?: string }).role;
    if (!canClose && role !== "ADMIN") {
      throw new Error("You don't have permission to close CARs");
    }

    const car = await db.query.correctiveActionRequests.findFirst({
      where: and(
        eq(correctiveActionRequests.id, carId),
        eq(correctiveActionRequests.isDeleted, false),
      ),
    });

    if (!car) throw new Error("CAR not found");
    if (car.status !== "PENDING_CLOSURE") {
      throw new Error("CAR must be in PENDING_CLOSURE status to close");
    }

    if (!note || note.trim().length === 0) {
      throw new Error("Closing note is required");
    }

    await db
      .update(correctiveActionRequests)
      .set({
        status: "CLOSED",
        closingDate: new Date(),
        closedById: userId,
        closingApprovalNote: note.trim(),
      })
      .where(eq(correctiveActionRequests.id, carId));

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId,
      userId,
      action: "CLOSED",
      details: { note: note.trim() },
    });

    // Notify requester, assignee, and notification users
    const notifyUserIds = new Set<string>();
    notifyUserIds.add(car.requesterId);
    notifyUserIds.add(car.assigneeId);

    const notifUsers = await db
      .select({ userId: carNotificationUsers.userId })
      .from(carNotificationUsers)
      .where(eq(carNotificationUsers.carId, carId));

    for (const nu of notifUsers) {
      notifyUserIds.add(nu.userId);
    }

    notifyUserIds.delete(userId); // Don't notify yourself

    for (const uid of notifyUserIds) {
      await enqueueNotification({
        userId: uid,
        type: "REMINDER",
        titleKey: "carClosed",
        messageParams: { carCode: car.carCode },
      });
    }

    revalidatePath(`/car/${carId}`);
    revalidatePath("/car/list");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- rejectCarClosure: KG rejection (PENDING_CLOSURE -> ACTION_RESULTS) ---

export async function rejectCarClosure(
  carId: string,
  comment: string,
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const canClose = await hasPermission(userId, "CLOSE_CAR");
    const role = (session.user as { role?: string }).role;
    if (!canClose && role !== "ADMIN") {
      throw new Error("You don't have permission to reject CAR closure");
    }

    const car = await db.query.correctiveActionRequests.findFirst({
      where: and(
        eq(correctiveActionRequests.id, carId),
        eq(correctiveActionRequests.isDeleted, false),
      ),
    });

    if (!car) throw new Error("CAR not found");
    if (car.status !== "PENDING_CLOSURE") {
      throw new Error("CAR must be in PENDING_CLOSURE status to reject");
    }

    if (!comment || comment.trim().length === 0) {
      throw new Error("Rejection comment is required");
    }

    await db
      .update(correctiveActionRequests)
      .set({ status: "ACTION_RESULTS" })
      .where(eq(correctiveActionRequests.id, carId));

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId,
      userId,
      action: "STATUS_CHANGED",
      details: {
        from: "PENDING_CLOSURE",
        to: "ACTION_RESULTS",
        rejectionComment: comment.trim(),
      },
    });

    // Notify assignee about rejection
    if (car.assigneeId !== userId) {
      await enqueueNotification({
        userId: car.assigneeId,
        type: "REMINDER",
        titleKey: "carClosureRejected",
        messageParams: { carCode: car.carCode },
      });
    }

    revalidatePath(`/car/${carId}`);
    revalidatePath("/car/list");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- cancelCar: Cancel from any non-terminal state ---

export async function cancelCar(
  carId: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const role = (session.user as { role?: string }).role;

    const car = await db.query.correctiveActionRequests.findFirst({
      where: and(
        eq(correctiveActionRequests.id, carId),
        eq(correctiveActionRequests.isDeleted, false),
      ),
    });

    if (!car) throw new Error("CAR not found");

    // Only ADMIN or requester can cancel
    const isRequester = car.requesterId === userId;
    const isAdmin = role === "ADMIN";
    if (!isRequester && !isAdmin) {
      throw new Error("Only the requester or admin can cancel a CAR");
    }

    if (car.status === "CLOSED" || car.status === "CANCELLED") {
      throw new Error("Cannot cancel a CAR that is already closed or cancelled");
    }

    if (!isValidTransition(car.status, "CANCELLED")) {
      throw new Error("Cannot cancel from current status");
    }

    await db
      .update(correctiveActionRequests)
      .set({ status: "CANCELLED" })
      .where(eq(correctiveActionRequests.id, carId));

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId,
      userId,
      action: "CANCELLED",
      details: { from: car.status, reason: reason?.trim() || null },
    });

    // Notify assignee if not the actor
    if (car.assigneeId !== userId) {
      await enqueueNotification({
        userId: car.assigneeId,
        type: "REMINDER",
        titleKey: "carCancelled",
        messageParams: { carCode: car.carCode },
      });
    }

    revalidatePath(`/car/${carId}`);
    revalidatePath("/car/list");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- Helper: Validate prerequisites for status transitions ---

async function validatePrerequisites(
  carId: string,
  currentStatus: string,
  nextStatus: string,
): Promise<void> {
  switch (nextStatus) {
    case "IMMEDIATE_ACTION": {
      // Must have at least 1 root cause analysis entry
      const [{ total }] = await db
        .select({ total: count() })
        .from(carRootCauseAnalyses)
        .where(eq(carRootCauseAnalyses.carId, carId));
      if (total === 0) {
        throw new Error(
          "Root cause analysis is required before proceeding",
        );
      }
      break;
    }
    case "PLANNED_ACTION": {
      // Must have at least 1 immediate action entry
      const [{ total }] = await db
        .select({ total: count() })
        .from(carImmediateActions)
        .where(eq(carImmediateActions.carId, carId));
      if (total === 0) {
        throw new Error(
          "Immediate action is required before proceeding",
        );
      }
      break;
    }
    case "ACTION_RESULTS": {
      if (currentStatus === "PLANNED_ACTION") {
        // Must have at least 1 corrective action
        const [{ total }] = await db
          .select({ total: count() })
          .from(carCorrectiveActions)
          .where(
            and(
              eq(carCorrectiveActions.carId, carId),
              eq(carCorrectiveActions.isDeleted, false),
            ),
          );
        if (total === 0) {
          throw new Error("At least one corrective action is required");
        }
      }
      // If coming from PENDING_CLOSURE (rejection), no prerequisites needed
      break;
    }
    case "PENDING_CLOSURE": {
      // All non-deleted, non-cancelled corrective actions must be COMPLETED
      const [{ incomplete }] = await db
        .select({ incomplete: count() })
        .from(carCorrectiveActions)
        .where(
          and(
            eq(carCorrectiveActions.carId, carId),
            eq(carCorrectiveActions.isDeleted, false),
            ne(carCorrectiveActions.status, "COMPLETED"),
            ne(carCorrectiveActions.status, "CANCELLED"),
          ),
        );
      if (incomplete > 0) {
        throw new Error(
          "All corrective actions must be completed before requesting closure",
        );
      }
      break;
    }
  }
}

// --- Helper: Notify relevant users on status change ---

async function notifyStatusChange(
  carId: string,
  car: { assigneeId: string; requesterId: string; carCode: string },
  newStatus: string,
  actorId: string,
): Promise<void> {
  // Notify assignee if not the actor
  if (car.assigneeId !== actorId) {
    await enqueueNotification({
      userId: car.assigneeId,
      type: "REMINDER",
      titleKey: "carStatusChanged",
      messageParams: { carCode: car.carCode, status: newStatus },
    });
  }

  // If moving to PENDING_CLOSURE, notify users with CLOSE_CAR permission
  if (newStatus === "PENDING_CLOSURE") {
    const closers = await db
      .select({ userId: userPermissions.userId })
      .from(userPermissions)
      .where(eq(userPermissions.permission, "CLOSE_CAR"));

    for (const closer of closers) {
      if (closer.userId !== actorId) {
        await enqueueNotification({
          userId: closer.userId,
          type: "APPROVAL_REQUEST",
          titleKey: "carClosureRequested",
          messageParams: { carCode: car.carCode },
        });
      }
    }
  }

  // Notify notification users
  const notifUsers = await db
    .select({ userId: carNotificationUsers.userId })
    .from(carNotificationUsers)
    .where(eq(carNotificationUsers.carId, carId));

  for (const nu of notifUsers) {
    if (nu.userId !== actorId) {
      await enqueueNotification({
        userId: nu.userId,
        type: "REMINDER",
        titleKey: "carStatusChanged",
        messageParams: { carCode: car.carCode, status: newStatus },
      });
    }
  }
}
