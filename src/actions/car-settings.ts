"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  carSources,
  carSystems,
  carProcesses,
  carCustomers,
  carProducts,
  carOperations,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { classifyError, type ActionResult } from "@/lib/errors";
import { z } from "zod/v4";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") throw new Error("Forbidden");
  return session;
}

const lookupTables = {
  sources: carSources,
  systems: carSystems,
  processes: carProcesses,
  customers: carCustomers,
  products: carProducts,
  operations: carOperations,
} as const;

type LookupType = keyof typeof lookupTables;

const lookupItemSchema = z.object({
  name: z.string().min(1).max(200),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type LookupItem = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function getLookupItems(type: LookupType): Promise<LookupItem[]> {
  await requireAdmin();
  const table = lookupTables[type];

  return await db
    .select()
    .from(table)
    .where(eq(table.isDeleted, false))
    .orderBy(asc(table.sortOrder), asc(table.name));
}

export async function createLookupItem(
  type: LookupType,
  data: { name: string; sortOrder?: number },
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = lookupItemSchema.parse(data);
    const table = lookupTables[type];

    await db.insert(table).values({
      name: parsed.name,
      sortOrder: parsed.sortOrder ?? 0,
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function updateLookupItem(
  id: string,
  type: LookupType,
  data: { name?: string; sortOrder?: number; isActive?: boolean },
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const table = lookupTables[type];

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await db.update(table).set(updateData).where(eq(table.id, id));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function deleteLookupItem(
  id: string,
  type: LookupType,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const table = lookupTables[type];

    await db
      .update(table)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(table.id, id));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}
