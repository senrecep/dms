"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  correctiveActionRequests,
  carCorrectiveActions,
  carActivityLogs,
  carSources,
  users,
  departments,
} from "@/lib/db/schema";
import {
  eq,
  and,
  not,
  inArray,
  count,
  sql,
  desc,
  gte,
  lt,
  isNotNull,
} from "drizzle-orm";
import { headers } from "next/headers";

// --- Helpers ---

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

const TERMINAL_STATUSES = ["CLOSED", "CANCELLED"] as const;

// --- Dashboard Stats ---

export async function getCarDashboardStats() {
  await getSession();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [totalResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(eq(correctiveActionRequests.isDeleted, false));

  const [openResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        not(inArray(correctiveActionRequests.status, [...TERMINAL_STATUSES])),
      ),
    );

  const [overdueResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        not(inArray(correctiveActionRequests.status, [...TERMINAL_STATUSES])),
        lt(correctiveActionRequests.targetCompletionDate, now),
      ),
    );

  const [pendingClosureResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.status, "PENDING_CLOSURE"),
      ),
    );

  const [closedThisMonthResult] = await db
    .select({ count: count() })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.status, "CLOSED"),
        gte(correctiveActionRequests.closingDate, startOfMonth),
        lt(correctiveActionRequests.closingDate, endOfMonth),
      ),
    );

  return {
    total: totalResult.count,
    open: openResult.count,
    overdue: overdueResult.count,
    pendingClosure: pendingClosureResult.count,
    closedThisMonth: closedThisMonthResult.count,
  };
}

// --- Status Distribution ---

export async function getCarStatusDistribution() {
  await getSession();

  const results = await db
    .select({
      status: correctiveActionRequests.status,
      count: count(),
    })
    .from(correctiveActionRequests)
    .where(eq(correctiveActionRequests.isDeleted, false))
    .groupBy(correctiveActionRequests.status);

  return results.map((r) => ({
    status: r.status,
    count: r.count,
  }));
}

// --- Monthly Trend (Last 12 months) ---

export async function getCarMonthlyTrend() {
  await getSession();

  const now = new Date();
  const months: Array<{ month: string; opened: number; closed: number }> = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const [openedResult] = await db
      .select({ count: count() })
      .from(correctiveActionRequests)
      .where(
        and(
          eq(correctiveActionRequests.isDeleted, false),
          gte(correctiveActionRequests.createdAt, date),
          lt(correctiveActionRequests.createdAt, nextMonth),
        ),
      );

    const [closedResult] = await db
      .select({ count: count() })
      .from(correctiveActionRequests)
      .where(
        and(
          eq(correctiveActionRequests.isDeleted, false),
          eq(correctiveActionRequests.status, "CLOSED"),
          gte(correctiveActionRequests.closingDate, date),
          lt(correctiveActionRequests.closingDate, nextMonth),
        ),
      );

    months.push({
      month: monthLabel,
      opened: openedResult.count,
      closed: closedResult.count,
    });
  }

  return months;
}

// --- Department Stats ---

export async function getCarByDepartmentStats() {
  await getSession();

  const requesterStats = await db
    .select({
      departmentId: correctiveActionRequests.requesterDepartmentId,
      count: count(),
    })
    .from(correctiveActionRequests)
    .where(eq(correctiveActionRequests.isDeleted, false))
    .groupBy(correctiveActionRequests.requesterDepartmentId);

  const responsibleStats = await db
    .select({
      departmentId: correctiveActionRequests.responsibleDepartmentId,
      count: count(),
    })
    .from(correctiveActionRequests)
    .where(eq(correctiveActionRequests.isDeleted, false))
    .groupBy(correctiveActionRequests.responsibleDepartmentId);

  const openStats = await db
    .select({
      departmentId: correctiveActionRequests.responsibleDepartmentId,
      count: count(),
    })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        not(inArray(correctiveActionRequests.status, [...TERMINAL_STATUSES])),
      ),
    )
    .groupBy(correctiveActionRequests.responsibleDepartmentId);

  // Get all department names
  const allDeptIds = new Set([
    ...requesterStats.map((r) => r.departmentId),
    ...responsibleStats.map((r) => r.departmentId),
  ]);

  if (allDeptIds.size === 0) return [];

  const deptNames = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(inArray(departments.id, [...allDeptIds]));

  const deptMap = new Map(deptNames.map((d) => [d.id, d.name]));
  const requesterMap = new Map(requesterStats.map((r) => [r.departmentId, r.count]));
  const responsibleMap = new Map(responsibleStats.map((r) => [r.departmentId, r.count]));
  const openMap = new Map(openStats.map((r) => [r.departmentId, r.count]));

  return [...allDeptIds].map((deptId) => ({
    departmentName: deptMap.get(deptId) ?? "Unknown",
    asRequester: requesterMap.get(deptId) ?? 0,
    asResponsible: responsibleMap.get(deptId) ?? 0,
    open: openMap.get(deptId) ?? 0,
  }));
}

// --- Source Stats ---

export async function getCarBySourceStats() {
  await getSession();

  const results = await db
    .select({
      sourceId: correctiveActionRequests.sourceId,
      sourceName: carSources.name,
      count: count(),
      avgCloseDays: sql<number>`
        COALESCE(
          AVG(
            CASE WHEN ${correctiveActionRequests.status} = 'CLOSED' AND ${correctiveActionRequests.closingDate} IS NOT NULL
            THEN EXTRACT(EPOCH FROM (${correctiveActionRequests.closingDate} - ${correctiveActionRequests.createdAt})) / 86400
            ELSE NULL END
          ),
          0
        )
      `.as("avg_close_days"),
    })
    .from(correctiveActionRequests)
    .innerJoin(carSources, eq(correctiveActionRequests.sourceId, carSources.id))
    .where(eq(correctiveActionRequests.isDeleted, false))
    .groupBy(correctiveActionRequests.sourceId, carSources.name);

  return results.map((r) => ({
    sourceName: r.sourceName,
    count: r.count,
    avgCloseDays: Math.round(Number(r.avgCloseDays)),
  }));
}

// --- Average Closure Time ---

export async function getCarAverageClosureTime() {
  await getSession();

  const [overallResult] = await db
    .select({
      avgDays: sql<number>`
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (${correctiveActionRequests.closingDate} - ${correctiveActionRequests.createdAt})) / 86400),
          0
        )
      `.as("avg_days"),
    })
    .from(correctiveActionRequests)
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.status, "CLOSED"),
        isNotNull(correctiveActionRequests.closingDate),
      ),
    );

  // Trend: last 6 months
  const now = new Date();
  const trend: Array<{ month: string; avgDays: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const [monthResult] = await db
      .select({
        avgDays: sql<number>`
          COALESCE(
            AVG(EXTRACT(EPOCH FROM (${correctiveActionRequests.closingDate} - ${correctiveActionRequests.createdAt})) / 86400),
            0
          )
        `.as("avg_days"),
      })
      .from(correctiveActionRequests)
      .where(
        and(
          eq(correctiveActionRequests.isDeleted, false),
          eq(correctiveActionRequests.status, "CLOSED"),
          isNotNull(correctiveActionRequests.closingDate),
          gte(correctiveActionRequests.closingDate, date),
          lt(correctiveActionRequests.closingDate, nextMonth),
        ),
      );

    trend.push({
      month: monthLabel,
      avgDays: Math.round(Number(monthResult.avgDays)),
    });
  }

  return {
    overall: Math.round(Number(overallResult.avgDays)),
    trend,
  };
}

// --- Overdue List ---

export async function getCarOverdueList() {
  await getSession();

  const now = new Date();

  const results = await db
    .select({
      id: correctiveActionRequests.id,
      carCode: correctiveActionRequests.carCode,
      createdAt: correctiveActionRequests.createdAt,
      assigneeName: users.name,
      responsibleDeptName: departments.name,
      targetDate: correctiveActionRequests.targetCompletionDate,
    })
    .from(correctiveActionRequests)
    .innerJoin(users, eq(correctiveActionRequests.assigneeId, users.id))
    .innerJoin(
      departments,
      eq(correctiveActionRequests.responsibleDepartmentId, departments.id),
    )
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        not(inArray(correctiveActionRequests.status, [...TERMINAL_STATUSES])),
        lt(correctiveActionRequests.targetCompletionDate, now),
      ),
    )
    .orderBy(correctiveActionRequests.targetCompletionDate);

  return results.map((r) => {
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(r.targetDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      id: r.id,
      carCode: r.carCode,
      createdAt: r.createdAt,
      assigneeName: r.assigneeName,
      responsibleDeptName: r.responsibleDeptName,
      targetDate: r.targetDate,
      daysOverdue,
    };
  });
}

// --- Recent Activity ---

export async function getCarRecentActivity() {
  await getSession();

  const results = await db
    .select({
      id: carActivityLogs.id,
      carId: carActivityLogs.carId,
      action: carActivityLogs.action,
      userName: users.name,
      createdAt: carActivityLogs.createdAt,
      carCode: correctiveActionRequests.carCode,
    })
    .from(carActivityLogs)
    .innerJoin(users, eq(carActivityLogs.userId, users.id))
    .innerJoin(
      correctiveActionRequests,
      eq(carActivityLogs.carId, correctiveActionRequests.id),
    )
    .where(eq(correctiveActionRequests.isDeleted, false))
    .orderBy(desc(carActivityLogs.createdAt))
    .limit(20);

  return results.map((r) => ({
    id: r.id,
    carCode: r.carCode,
    carId: r.carId,
    action: r.action,
    userName: r.userName,
    createdAt: r.createdAt,
  }));
}

// --- My Tasks: Assigned CARs ---

export async function getMyAssignedCars() {
  const session = await getSession();
  const userId = session.user.id;

  const results = await db
    .select({
      id: correctiveActionRequests.id,
      carCode: correctiveActionRequests.carCode,
      status: correctiveActionRequests.status,
      targetDate: correctiveActionRequests.targetCompletionDate,
      createdAt: correctiveActionRequests.createdAt,
      responsibleDeptName: departments.name,
    })
    .from(correctiveActionRequests)
    .innerJoin(
      departments,
      eq(correctiveActionRequests.responsibleDepartmentId, departments.id),
    )
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.assigneeId, userId),
        not(inArray(correctiveActionRequests.status, [...TERMINAL_STATUSES])),
      ),
    )
    .orderBy(correctiveActionRequests.targetCompletionDate);

  return results;
}

// --- My Tasks: Assigned Corrective Actions ---

export async function getMyAssignedActions() {
  const session = await getSession();
  const userId = session.user.id;

  const results = await db
    .select({
      id: carCorrectiveActions.id,
      carId: carCorrectiveActions.carId,
      description: carCorrectiveActions.description,
      status: carCorrectiveActions.status,
      targetDate: carCorrectiveActions.targetDate,
      carCode: correctiveActionRequests.carCode,
    })
    .from(carCorrectiveActions)
    .innerJoin(
      correctiveActionRequests,
      eq(carCorrectiveActions.carId, correctiveActionRequests.id),
    )
    .where(
      and(
        eq(carCorrectiveActions.isDeleted, false),
        eq(carCorrectiveActions.ownerId, userId),
        not(eq(carCorrectiveActions.status, "COMPLETED")),
        not(eq(carCorrectiveActions.status, "CANCELLED")),
      ),
    )
    .orderBy(carCorrectiveActions.targetDate);

  return results;
}

// --- My Tasks: Pending Closures ---

export async function getMyPendingClosures() {
  await getSession();

  const results = await db
    .select({
      id: correctiveActionRequests.id,
      carCode: correctiveActionRequests.carCode,
      status: correctiveActionRequests.status,
      assigneeName: users.name,
      targetDate: correctiveActionRequests.targetCompletionDate,
      createdAt: correctiveActionRequests.createdAt,
      responsibleDeptName: departments.name,
    })
    .from(correctiveActionRequests)
    .innerJoin(users, eq(correctiveActionRequests.assigneeId, users.id))
    .innerJoin(
      departments,
      eq(correctiveActionRequests.responsibleDepartmentId, departments.id),
    )
    .where(
      and(
        eq(correctiveActionRequests.isDeleted, false),
        eq(correctiveActionRequests.status, "PENDING_CLOSURE"),
      ),
    )
    .orderBy(correctiveActionRequests.targetCompletionDate);

  return results;
}
