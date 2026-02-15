"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";

export async function getDepartmentManagerCandidates() {
  const candidates = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(or(eq(users.role, "ADMIN"), eq(users.role, "MANAGER")));
  return candidates;
}
