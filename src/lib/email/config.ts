import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { EmailLocale } from "./translations";

export type EmailProvider = "resend" | "smtp";

export type EmailConfig = {
  provider: EmailProvider;
  fromAddress: string;
  resendApiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
};

const EMAIL_SETTING_KEYS = [
  "email_provider",
  "email_from",
  "email_resend_api_key",
  "email_smtp_host",
  "email_smtp_port",
  "email_smtp_user",
  "email_smtp_pass",
  "email_smtp_secure",
] as const;

let cachedConfig: EmailConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

export function invalidateEmailConfigCache() {
  cachedConfig = null;
  cacheTime = 0;
  cachedLanguage = null;
  languageCacheTime = 0;
}

// --- Email Language ---

let cachedLanguage: EmailLocale | null = null;
let languageCacheTime = 0;

export async function getEmailLanguage(): Promise<EmailLocale> {
  if (cachedLanguage && Date.now() - languageCacheTime < CACHE_TTL) {
    return cachedLanguage;
  }

  const row = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, "email_language"))
    .limit(1);

  const value = row[0]?.value;
  cachedLanguage = value === "tr" ? "tr" : "en";
  languageCacheTime = Date.now();

  return cachedLanguage;
}

export async function getEmailConfig(): Promise<EmailConfig> {
  if (cachedConfig && Date.now() - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  const rows = await db
    .select({ key: systemSettings.key, value: systemSettings.value })
    .from(systemSettings)
    .where(inArray(systemSettings.key, [...EMAIL_SETTING_KEYS]));

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  cachedConfig = {
    provider: (map.email_provider as EmailProvider) || "resend",
    fromAddress: map.email_from || "DMS <noreply@example.com>",
    resendApiKey: map.email_resend_api_key || "",
    smtpHost: map.email_smtp_host || "",
    smtpPort: parseInt(map.email_smtp_port || "587", 10),
    smtpUser: map.email_smtp_user || "",
    smtpPass: map.email_smtp_pass || "",
    smtpSecure: map.email_smtp_secure === "true",
  };
  cacheTime = Date.now();

  return cachedConfig;
}
