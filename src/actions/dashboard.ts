"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, approvals, readConfirmations, users, activityLogs } from "@/lib/db/schema";
import { eq, and, count, isNull, desc } from "drizzle-orm";
import { headers } from "next/headers";

export async function getDashboardStats() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const [totalDocumentsResult] = await db
    .select({ count: count() })
    .from(documents)
    .where(eq(documents.isDeleted, false));

  const [pendingApprovalsResult] = await db
    .select({ count: count() })
    .from(approvals)
    .where(
      and(
        eq(approvals.status, "PENDING"),
        eq(approvals.approverId, session.user.id),
      ),
    );

  const [unreadDocumentsResult] = await db
    .select({ count: count() })
    .from(readConfirmations)
    .where(
      and(
        eq(readConfirmations.userId, session.user.id),
        isNull(readConfirmations.confirmedAt),
      ),
    );

  const [activeUsersResult] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.isActive, true));

  return {
    totalDocuments: totalDocumentsResult.count,
    pendingApprovals: pendingApprovalsResult.count,
    unreadDocuments: unreadDocumentsResult.count,
    activeUsers: activeUsersResult.count,
  };
}

export async function getPendingTasks() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const pendingApprovalsList = await db
    .select({
      id: approvals.id,
      documentId: approvals.documentId,
      documentTitle: documents.title,
      documentCode: documents.documentCode,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .innerJoin(documents, eq(approvals.documentId, documents.id))
    .where(
      and(
        eq(approvals.status, "PENDING"),
        eq(approvals.approverId, session.user.id),
      ),
    )
    .orderBy(desc(approvals.createdAt))
    .limit(5);

  const unreadDocumentsList = await db
    .select({
      id: readConfirmations.id,
      documentId: readConfirmations.documentId,
      documentTitle: documents.title,
      documentCode: documents.documentCode,
      createdAt: readConfirmations.createdAt,
    })
    .from(readConfirmations)
    .innerJoin(documents, eq(readConfirmations.documentId, documents.id))
    .where(
      and(
        eq(readConfirmations.userId, session.user.id),
        isNull(readConfirmations.confirmedAt),
      ),
    )
    .orderBy(desc(readConfirmations.createdAt))
    .limit(5);

  return { pendingApprovals: pendingApprovalsList, unreadDocuments: unreadDocumentsList };
}

export async function getRecentActivity(limit: number = 10) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const activities = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      createdAt: activityLogs.createdAt,
      userName: users.name,
      documentTitle: documents.title,
      documentCode: documents.documentCode,
    })
    .from(activityLogs)
    .innerJoin(users, eq(activityLogs.userId, users.id))
    .innerJoin(documents, eq(activityLogs.documentId, documents.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  return activities;
}
