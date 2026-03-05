"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPermissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { classifyError, type ActionResult } from "@/lib/errors";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") throw new Error("Forbidden");
  return session;
}

export async function getUserPermissions(userId: string) {
  await requireAdmin();
  return await db
    .select()
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));
}

export async function grantPermission(
  userId: string,
  permission: string,
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    const existing = await db
      .select({ id: userPermissions.id })
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permission, permission),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return { success: true };
    }

    await db.insert(userPermissions).values({
      userId,
      permission,
      grantedById: session.user.id,
    });

    revalidatePath(`/users/${userId}`);
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function revokePermission(
  userId: string,
  permission: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    await db
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permission, permission),
        ),
      );

    revalidatePath(`/users/${userId}`);
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function hasPermission(
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
