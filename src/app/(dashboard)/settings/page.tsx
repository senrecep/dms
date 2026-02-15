import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { asc, not, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { SettingsForm } from "@/components/settings/settings-form";
import { EmailSettingsForm } from "@/components/settings/email-settings-form";
import { getEmailSettings } from "@/actions/settings";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN") redirect("/");

  const t = await getTranslations("settings");

  const settings = await db
    .select()
    .from(systemSettings)
    .where(not(like(systemSettings.key, "email_%")))
    .orderBy(asc(systemSettings.createdAt));

  const emailSettings = await getEmailSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>
      <SettingsForm settings={settings} />
      <EmailSettingsForm initialSettings={emailSettings} />
    </div>
  );
}
