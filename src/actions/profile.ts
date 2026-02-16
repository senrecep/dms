"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, departments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { classifyError, type ActionResult } from "@/lib/errors";

async function getSessionOrThrow() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function getProfile() {
  const session = await getSessionOrThrow();

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      departmentId: users.departmentId,
      departmentName: departments.name,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (result.length === 0) throw new Error("User not found");
  return result[0];
}

export async function updateProfile(data: { name: string }): Promise<ActionResult> {
  try {
    const session = await getSessionOrThrow();

    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: "Name is required", errorCode: "NAME_REQUIRED" };
    }

    await db
      .update(users)
      .set({ name: data.name.trim() })
      .where(eq(users.id, session.user.id));

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}
