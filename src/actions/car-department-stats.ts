"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  correctiveActionRequests,
  carActivityLogs,
  users,
} from "@/lib/db/schema";
import { eq, and, not, inArray, count, lt, desc } from "drizzle-orm";
import { headers } from "next/headers";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

const TERMINAL_STATUSES = ["CLOSED", "CANCELLED"] as const;

export async function getDepartmentCarStats(departmentId: string) {
  await getSession();

  const now = new Date();

  const [asRequesterDeptResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.requesterDepartmentId, departmentId),
      ),
    );

  const [asResponsibleDeptResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.responsibleDepartmentId, departmentId),
      ),
    );

  const [openAsResponsibleResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.responsibleDepartmentId, departmentId),
        not(inArray(correctiveActionRequests.status, [...TERMINAL_STATUSES])),
      ),
    );

  const [overdueAsResponsibleResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.responsibleDepartmentId, departmentId),
        not(inArray(correctiveActionRequests.status, [...TERMINAL_STATUSES])),
        lt(correctiveActionRequests.targetCompletionDate, now),
      ),
    );

  const [closedAsResponsibleResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.responsibleDepartmentId, departmentId),
        eq(correctiveActionRequests.status, "CLOSED"),
      ),
    );

  const statusBreakdown = await db
    .select({
      status: correctiveActionRequests.status,
      count: count(),
    })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.responsibleDepartmentId, departmentId),
      ),
    )
    .groupBy(correctiveActionRequests.status);

  const recentActivity = await db
    .select({
      id: carActivityLogs.id,
      carId: carActivityLogs.carId,
      carCode: correctiveActionRequests.carCode,
      action: carActivityLogs.action,
      userName: users.name,
      createdAt: carActivityLogs.createdAt,
    })
    .from(carActivityLogs)
    .innerJoin(
      correctiveActionRequests,
      eq(carActivityLogs.carId, correctiveActionRequests.id),
    )
    .innerJoin(users, eq(carActivityLogs.userId, users.id))
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.responsibleDepartmentId, departmentId),
      ),
    )
    .orderBy(desc(carActivityLogs.createdAt))
    .limit(10);

  return {
    asRequesterDept: asRequesterDeptResult.count,
    asResponsibleDept: asResponsibleDeptResult.count,
    openAsResponsible: openAsResponsibleResult.count,
    overdueAsResponsible: overdueAsResponsibleResult.count,
    closedAsResponsible: closedAsResponsibleResult.count,
    statusBreakdown: statusBreakdown.map((r) => ({
      status: r.status,
      count: r.count,
    })),
    recentCarActivity: recentActivity.map((r) => ({
      id: r.id,
      carId: r.carId,
      carCode: r.carCode,
      action: r.action,
      userName: r.userName,
      createdAt: r.createdAt,
    })),
  };
}
