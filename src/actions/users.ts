"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, departments } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";

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
}) {
  await requireAdmin();

  // Check if email already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, formData.email))
    .limit(1);

  if (existing.length > 0) {
    return { error: "A user with this email already exists." };
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
    return { error: "Failed to create user." };
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
}

export async function sendPasswordReset(userId: string) {
  await requireAdmin();

  const user = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    return { error: "User not found." };
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
    return { error: "Failed to send password reset email." };
  }

  return { success: true };
}

export async function getDepartmentsList() {
  const depts = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(eq(departments.isActive, true));
  return depts;
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await requireAdmin();
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
  revalidatePath("/users");
  return { success: true };
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
) {
  await requireAdmin();

  // Check email uniqueness (exclude current user)
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, formData.email), ne(users.id, userId)))
    .limit(1);

  if (existing.length > 0) {
    return { error: "A user with this email already exists." };
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
}
