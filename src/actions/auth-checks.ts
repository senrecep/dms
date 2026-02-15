"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function checkCurrentUserActive() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { active: false };

  const result = await db
    .select({ isActive: users.isActive })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return { active: result.length > 0 && result[0].isActive };
}
