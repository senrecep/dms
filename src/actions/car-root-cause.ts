"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  correctiveActionRequests,
  carRootCauseAnalyses,
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

// Status order for >= comparisons
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

// --- saveRootCause (upsert) ---

const saveRootCauseSchema = z.object({
  carId: z.string().min(1),
  description: z.string().min(1).max(5000),
});

export async function saveRootCause(
  carId: string,
  description: string,
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const parsed = saveRootCauseSchema.safeParse({ carId, description });
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

    if (!isStatusAtLeast(car.status, "ROOT_CAUSE_ANALYSIS")) {
      throw new Error("CAR is not in a valid status for root cause analysis");
    }

    // Upsert: check if an entry exists for this carId
    const existing = await db.query.carRootCauseAnalyses.findFirst({
      where: eq(carRootCauseAnalyses.carId, carId),
    });

    const isUpdate = !!existing;

    if (existing) {
      await db
        .update(carRootCauseAnalyses)
        .set({ description: description.trim() })
        .where(eq(carRootCauseAnalyses.id, existing.id));
    } else {
      await db.insert(carRootCauseAnalyses).values({
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
      action: isUpdate ? "ROOT_CAUSE_UPDATED" : "ROOT_CAUSE_ADDED",
      details: { description: description.trim() },
    });

    revalidatePath(`/car/${carId}`);
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

// --- getRootCauses ---

export async function getRootCauses(carId: string) {
  await getSession();
  return db.query.carRootCauseAnalyses.findMany({
    where: eq(carRootCauseAnalyses.carId, carId),
    with: {
      createdBy: {
        columns: { id: true, name: true, email: true },
      },
    },
  });
}
