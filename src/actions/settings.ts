"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { invalidateEmailConfigCache } from "@/lib/email/config";
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

export async function updateSetting(key: string, value: string): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    await db
      .update(systemSettings)
      .set({
        value,
        updatedById: session.user.id,
      })
      .where(eq(systemSettings.key, key));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function getEmailSettings() {
  await requireAdmin();

  const keys = [
    "email_provider",
    "email_from",
    "email_language",
    "email_resend_api_key",
    "email_smtp_host",
    "email_smtp_port",
    "email_smtp_user",
    "email_smtp_pass",
    "email_smtp_secure",
  ];

  const rows = await db
    .select({ key: systemSettings.key, value: systemSettings.value })
    .from(systemSettings)
    .where(inArray(systemSettings.key, keys));

  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function saveEmailSettings(settings: Record<string, string>): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    const allowedKeys = [
      "email_provider",
      "email_from",
      "email_language",
      "email_resend_api_key",
      "email_smtp_host",
      "email_smtp_port",
      "email_smtp_user",
      "email_smtp_pass",
      "email_smtp_secure",
    ];

    for (const [key, value] of Object.entries(settings)) {
      if (!allowedKeys.includes(key)) continue;

      // Upsert: try update, then insert if not exists
      const updated = await db
        .update(systemSettings)
        .set({ value, updatedById: session.user.id })
        .where(eq(systemSettings.key, key))
        .returning();

      if (updated.length === 0) {
        await db.insert(systemSettings).values({
          key,
          value,
          description: `Email configuration: ${key}`,
          updatedById: session.user.id,
        });
      }
    }

    invalidateEmailConfigCache();
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function getCompanySettings() {
  const keys = ["company_name", "company_logo_url", "pdf_language"];

  const rows = await db
    .select({ key: systemSettings.key, value: systemSettings.value })
    .from(systemSettings)
    .where(inArray(systemSettings.key, keys));

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    companyName: map.company_name ?? "",
    companyLogoUrl: map.company_logo_url ?? "",
    pdfLanguage: (map.pdf_language as "tr" | "en") ?? "tr",
  };
}

export async function saveCompanySettings(settings: {
  company_name?: string;
  company_logo_url?: string;
  pdf_language?: string;
}): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    const allowedKeys = ["company_name", "company_logo_url", "pdf_language"];

    for (const [key, value] of Object.entries(settings)) {
      if (!allowedKeys.includes(key) || value === undefined) continue;

      const updated = await db
        .update(systemSettings)
        .set({ value, updatedById: session.user.id })
        .where(eq(systemSettings.key, key))
        .returning();

      if (updated.length === 0) {
        await db.insert(systemSettings).values({
          key,
          value,
          description: `Company setting: ${key}`,
          updatedById: session.user.id,
        });
      }
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function sendTestEmail(toEmail: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    // Import dynamically to avoid circular deps
    const { sendEmail } = await import("@/lib/email");
    const { getEmailLanguage } = await import("@/lib/email/config");
    const { emailStrings, resolveSubject } = await import("@/lib/email/translations");
    const { EmailLayout } = await import("@/lib/email/templates/layout");
    const React = await import("react");

    const locale = await getEmailLanguage();
    const t = emailStrings[locale].testEmail;

    const body = React.createElement(
      "p",
      {
        style: {
          color: "#374151",
          fontSize: "14px",
          lineHeight: "24px",
        },
      },
      t.body,
    );

    const template = React.createElement(
      EmailLayout,
      { preview: "QMS Test Email", locale, children: body }
    );

    const result = await sendEmail({
      to: toEmail,
      subject: resolveSubject(locale, "testEmail"),
      template,
    });

    if (!result.success) {
      return { success: false, error: result.error || "Email send failed", errorCode: "EMAIL_TEST_FAILED" };
    }

    return { success: true };
  } catch (error) {
    return classifyError(error);
  }
}
