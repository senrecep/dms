"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  correctiveActionRequests,
  carCorrectiveActions,
  carActivityLogs,
} from "@/lib/db/schema";
import { eq, and, not, inArray, count, lt, desc } from "drizzle-orm";
import { headers } from "next/headers";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

const TERMINAL_STATUSES = ["CLOSED", "CANCELLED"] as const;

export async function getUserCarStats(userId: string) {
  await getSession();

  const now = new Date();

  const [carsAsRequesterResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.requesterId, userId),
      ),
    );

  const [carsAsAssigneeResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.assigneeId, userId),
      ),
    );

  const [openCarsResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.assigneeId, userId),
        not(inArray(correctiveActionRequests.status, [...TERMINAL_STATUSES])),
      ),
    );

  const [overdueCarsResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.assigneeId, userId),
        not(inArray(correctiveActionRequests.status, [...TERMINAL_STATUSES])),
        lt(correctiveActionRequests.targetCompletionDate, now),
      ),
    );

  const [correctiveActionsOwnedResult] = await db
    .select({ count: count() })
    .from(carCorrectiveActions)
    .where(
      and(
        eq(carCorrectiveActions.isDeleted, false),
        eq(carCorrectiveActions.ownerId, userId),
      ),
    );

  const [completedActionsResult] = await db
    .select({ count: count() })
    .from(carCorrectiveActions)
    .where(
      and(
        eq(carCorrectiveActions.isDeleted, false),
        eq(carCorrectiveActions.ownerId, userId),
        eq(carCorrectiveActions.status, "COMPLETED"),
      ),
    );

  const recentActivity = await db
    .select({
      id: carActivityLogs.id,
      carId: carActivityLogs.carId,
      carCode: correctiveActionRequests.carCode,
      action: carActivityLogs.action,
      createdAt: carActivityLogs.createdAt,
    })
    .from(carActivityLogs)
    .innerJoin(
      correctiveActionRequests,
      eq(carActivityLogs.carId, correctiveActionRequests.id),
    )
    .where(
      and(
        eq(carActivityLogs.userId, userId),
        eq(correctiveActionRequests.isDeleted, false),
      ),
    )
    .orderBy(desc(carActivityLogs.createdAt))
    .limit(10);

  return {
    carsAsRequester: carsAsRequesterResult.count,
    carsAsAssignee: carsAsAssigneeResult.count,
    openCars: openCarsResult.count,
    overdueCars: overdueCarsResult.count,
    correctiveActionsOwned: correctiveActionsOwnedResult.count,
    completedActions: completedActionsResult.count,
    recentCarActivity: recentActivity.map((r) => ({
      id: r.id,
      carId: r.carId,
      carCode: r.carCode,
      action: r.action,
      createdAt: r.createdAt,
    })),
  };
}
