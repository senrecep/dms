import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDepartmentBySlug } from "@/actions/departments";
import { DepartmentDetailView } from "@/components/departments/department-detail-view";

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

  const t = await getTranslations("departments.detail");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <DepartmentDetailView department={department} />
    </div>
  );
}
