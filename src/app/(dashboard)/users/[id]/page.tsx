import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserDetail } from "@/actions/users";

export const metadata: Metadata = {
  title: "User Detail",
  description: "User profile, activity history, and role management.",
  robots: { index: false, follow: false },
};
import { getUserCarStats } from "@/actions/car-user-stats";
import { UserDetailView } from "@/components/users/user-detail-view";
import { UserCarStatsTab } from "@/components/users/user-car-stats-tab";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN") redirect("/");

  const { id } = await params;
  const [user, carStats] = await Promise.all([
    getUserDetail(id),
    getUserCarStats(id),
  ]);

  if (!user) notFound();

  const t = await getTranslations("settings.users.detail");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <Tabs defaultValue="dms">
        <TabsList>
          <TabsTrigger value="dms">Document Management</TabsTrigger>
          <TabsTrigger value="car">DFİ</TabsTrigger>
        </TabsList>
        <TabsContent value="dms">
          <UserDetailView user={user} />
        </TabsContent>
        <TabsContent value="car">
          <UserCarStatsTab stats={carStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
