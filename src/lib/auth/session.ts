import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Cached getSession — deduplicates DB queries within the same
 * React Server Component render pass (layout + page + nested layouts).
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
