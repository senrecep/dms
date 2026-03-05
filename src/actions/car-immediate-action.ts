"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  correctiveActionRequests,
  carImmediateActions,
  carActivityLogs,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { classifyError, type ActionResult } from "@/lib/errors";

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

// --- saveImmediateAction (upsert) ---

const saveImmediateActionSchema = z.object({
  carId: z.string().min(1),
  description: z.string().min(1).max(5000),
});

export async function saveImmediateAction(
  carId: string,
  description: string,
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const parsed = saveImmediateActionSchema.safeParse({ carId, description });
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

    if (!isStatusAtLeast(car.status, "IMMEDIATE_ACTION")) {
      throw new Error("CAR is not in a valid status for immediate action");
    }

    // Upsert: check if an entry exists for this carId
    const existing = await db.query.carImmediateActions.findFirst({
      where: eq(carImmediateActions.carId, carId),
    });

    const isUpdate = !!existing;

    if (existing) {
      await db
        .update(carImmediateActions)
        .set({ description: description.trim() })
        .where(eq(carImmediateActions.id, existing.id));
    } else {
      await db.insert(carImmediateActions).values({
        id: nanoid(),
        carId,
        description: description.trim(),
        createdById: userId,
      });
    }

    // Activity log
    await db.insert(carActivityLogs).values({
      id: nanoid(),
      carId,
      userId,
      action: isUpdate ? "IMMEDIATE_ACTION_UPDATED" : "IMMEDIATE_ACTION_ADDED",
      details: { description: description.trim() },
    });

    revalidatePath(`/car/${carId}`);
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- getImmediateActions ---

export async function getImmediateActions(carId: string) {
  await getSession();
  return db.query.carImmediateActions.findMany({
    where: eq(carImmediateActions.carId, carId),
    with: {
      createdBy: {
        columns: { id: true, name: true, email: true },
      },
    },
  });
}
