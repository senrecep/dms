"use server";

import { cookies } from "next/headers";

const COOKIE_NAME = "NEXT_LOCALE";

export async function getUserLocale() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || "tr";
}

export async function setUserLocale(locale: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, locale, {
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    path: "/",
  });
}
