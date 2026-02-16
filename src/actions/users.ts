"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users,
  departments,
  documentRevisions,
  approvals,
  readConfirmations,
  activityLogs,
  documents,
} from "@/lib/db/schema";
import { eq, and, ne, count, desc, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { classifyError, type ActionResult } from "@/lib/errors";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") throw new Error("Forbidden");
  return session;
}

export async function createUser(formData: {
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "USER";
  departmentId?: string;
}): Promise<ActionResult> {
  try {
    await requireAdmin();

    // Check if email already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, formData.email))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: "A user with this email already exists", errorCode: "EMAIL_EXISTS" };
    }

    // Generate a temporary password (never used directly by the user)
    const tempPassword = crypto.randomUUID();

    // Create user via Better Auth (handles password hashing)
    const result = await auth.api.signUpEmail({
      body: {
        name: formData.name,
        email: formData.email,
        password: tempPassword,
      },
    });

    if (!result.user) {
      return { success: false, error: "Failed to create user", errorCode: "USER_CREATE_FAILED" };
    }

    // Update role + department (input: false fields)
    await db
      .update(users)
      .set({
        role: formData.role,
        departmentId: formData.departmentId || null,
      })
      .where(eq(users.id, result.user.id));

    // Trigger password reset email via Better Auth endpoint
    await fetch(`${env.BETTER_AUTH_URL}/api/auth/request-password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.email,
        redirectTo: "/set-password",
      }),
    });

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function sendPasswordReset(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const user = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "User not found", errorCode: "USER_NOT_FOUND" };
    }

    const res = await fetch(`${env.BETTER_AUTH_URL}/api/auth/request-password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user[0].email,
        redirectTo: "/set-password",
      }),
    });

    if (!res.ok) {
      return { success: false, error: "Failed to send password reset email", errorCode: "PASSWORD_RESET_FAILED" };
    }

    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function getDepartmentsList() {
  const depts = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(eq(departments.isActive, true));
  return depts;
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
    await db.update(users).set({ isActive }).where(eq(users.id, userId));
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function updateUser(
  userId: string,
  formData: {
    name: string;
    email: string;
    role: "ADMIN" | "MANAGER" | "USER";
    departmentId?: string;
    isActive: boolean;
  }
): Promise<ActionResult> {
  try {
    await requireAdmin();

    // Check email uniqueness (exclude current user)
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, formData.email), ne(users.id, userId)))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: "A user with this email already exists", errorCode: "EMAIL_EXISTS" };
    }

    await db
      .update(users)
      .set({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        departmentId: formData.departmentId || null,
        isActive: formData.isActive,
      })
      .where(eq(users.id, userId));

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function getUserDetail(userId: string) {
  const userInfo = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      departmentName: departments.name,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (userInfo.length === 0) return null;

  // Optimized: 3 queries instead of 6 using conditional aggregation
  const [
    documentsCreatedResult,
    approvalStatsResult,
    readStatsResult,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(documentRevisions)
      .where(eq(documentRevisions.createdById, userId)),
    db
      .select({
        approved: sql<number>`count(*) filter (where ${approvals.status} = 'APPROVED')`.as("approved"),
        rejected: sql<number>`count(*) filter (where ${approvals.status} = 'REJECTED')`.as("rejected"),
        pending: sql<number>`count(*) filter (where ${approvals.status} = 'PENDING')`.as("pending"),
      })
      .from(approvals)
      .where(eq(approvals.approverId, userId)),
    db
      .select({
        confirmed: count(readConfirmations.confirmedAt),
        total: count(),
      })
      .from(readConfirmations)
      .where(eq(readConfirmations.userId, userId)),
  ]);

  const recentActivities = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      createdAt: activityLogs.createdAt,
      documentCode: documents.documentCode,
    })
    .from(activityLogs)
    .innerJoin(documents, eq(activityLogs.documentId, documents.id))
    .where(eq(activityLogs.userId, userId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(10);

  return {
    ...userInfo[0],
    stats: {
      documentsCreated: Number(documentsCreatedResult[0].count),
      approvalsApproved: Number(approvalStatsResult[0].approved),
      approvalsRejected: Number(approvalStatsResult[0].rejected),
      approvalsPending: Number(approvalStatsResult[0].pending),
      documentsRead: Number(readStatsResult[0].confirmed),
      readsPending: Number(readStatsResult[0].total) - Number(readStatsResult[0].confirmed),
    },
    recentActivities,
  };
}
