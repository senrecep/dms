import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure system settings, email, and notification preferences.",
  robots: { index: false, follow: false },
};
import { asc, not, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { SettingsForm } from "@/components/settings/settings-form";
import { EmailSettingsForm } from "@/components/settings/email-settings-form";
import { CarSettingsTab } from "@/components/settings/car-settings-tab";
import { getEmailSettings, getCompanySettings } from "@/actions/settings";
import { getLookupItems } from "@/actions/car-settings";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN") redirect("/");

  const t = await getTranslations("settings");

  const [settings, emailSettings, companySettings, sources, systems, processes, customers, products, operations] =
    await Promise.all([
      db
        .select()
        .from(systemSettings)
        .where(not(like(systemSettings.key, "email_%")))
        .orderBy(asc(systemSettings.createdAt)),
      getEmailSettings(),
      getCompanySettings(),
      getLookupItems("sources"),
      getLookupItems("systems"),
      getLookupItems("processes"),
      getLookupItems("customers"),
      getLookupItems("products"),
      getLookupItems("operations"),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">{t("generalSettings")}</TabsTrigger>
          <TabsTrigger value="email">{t("emailSettings")}</TabsTrigger>
          <TabsTrigger value="car">{t("carSettings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <CompanySettingsForm initialSettings={companySettings} />
          <SettingsForm settings={settings} />
        </TabsContent>
        <TabsContent value="email">
          <EmailSettingsForm initialSettings={emailSettings} />
        </TabsContent>
        <TabsContent value="car">
          <CarSettingsTab
            sources={sources}
            systems={systems}
            processes={processes}
            customers={customers}
            products={products}
            operations={operations}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
