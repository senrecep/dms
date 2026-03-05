import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDepartmentBySlug } from "@/actions/departments";

export const metadata: Metadata = {
  title: "Department Detail",
  description: "Department information, members, and document statistics.",
  robots: { index: false, follow: false },
};
import { getDepartmentCarStats } from "@/actions/car-department-stats";
import { DepartmentDetailView } from "@/components/departments/department-detail-view";
import { DepartmentCarStatsTab } from "@/components/departments/department-car-stats-tab";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id: slug } = await params;
  const department = await getDepartmentBySlug(slug);

  if (!department) notFound();
  if ("redirectFrom" in department && department.redirectFrom && department.slug !== slug) {
    redirect(`/departments/${department.slug}`);
  }

  const carStats = await getDepartmentCarStats(department.id);

  const userRole = (session.user as { role?: string }).role;
  const isAdmin = userRole === "ADMIN";
  const isManager = userRole === "MANAGER";
  const isDeptManager = isManager && department.managers.some((m) => m.id === session.user.id);

  const t = await getTranslations("departments.detail");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <Tabs defaultValue="dms">
        <TabsList>
          <TabsTrigger value="dms">Document Management</TabsTrigger>
          <TabsTrigger value="car">DFİ</TabsTrigger>
        </TabsList>
        <TabsContent value="dms">
          <DepartmentDetailView
            department={department}
            canEditDepartment={isAdmin || isDeptManager}
            editMode={isAdmin ? "admin" : "manager"}
            canCreateUser={isAdmin || isDeptManager}
            canResetPasswords={isAdmin || isDeptManager}
            showReadOnlyNotice={isManager && !isDeptManager}
          />
        </TabsContent>
        <TabsContent value="car">
          <DepartmentCarStatsTab stats={carStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
