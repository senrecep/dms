"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { departments, users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
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

export async function createDepartment(formData: {
  name: string;
  slug: string;
  description?: string;
  managerId?: string;
  isActive?: boolean;
}): Promise<ActionResult> {
  try {
    await requireAdmin();

    const existing = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.slug, formData.slug))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: "A department with this slug already exists", errorCode: "SLUG_EXISTS" };
    }

    await db.insert(departments).values({
      name: formData.name,
      slug: formData.slug,
      description: formData.description || null,
      managerId: formData.managerId || null,
      isActive: formData.isActive ?? true,
    });

    revalidatePath("/departments");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function updateDepartment(
  id: string,
  formData: {
    name: string;
    slug: string;
    description?: string;
    managerId?: string;
    isActive?: boolean;
  },
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const slugConflict = await db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.slug, formData.slug), ne(departments.id, id)))
      .limit(1);

    if (slugConflict.length > 0) {
      return { success: false, error: "A department with this slug already exists", errorCode: "SLUG_EXISTS" };
    }

    await db
      .update(departments)
      .set({
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        managerId: formData.managerId || null,
        isActive: formData.isActive ?? true,
      })
      .where(eq(departments.id, id));

    revalidatePath("/departments");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function toggleDepartmentActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
    await db.update(departments).set({ isActive }).where(eq(departments.id, id));
    revalidatePath("/departments");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function getDepartmentBySlug(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const dept = await db
    .select({
      id: departments.id,
      name: departments.name,
      slug: departments.slug,
      description: departments.description,
      isActive: departments.isActive,
      managerId: departments.managerId,
      managerName: users.name,
    })
    .from(departments)
    .leftJoin(users, eq(departments.managerId, users.id))
    .where(and(eq(departments.slug, slug), eq(departments.isDeleted, false)))
    .limit(1);

  if (dept.length === 0) return null;

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(eq(users.departmentId, dept[0].id), eq(users.isActive, true)));

  return { ...dept[0], members };
}
