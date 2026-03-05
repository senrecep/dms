import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCars, getCarLookups, getCarFormDepartments, type CarFilters } from "@/actions/car";
import { CarList } from "@/components/car/car-list";

export const metadata: Metadata = {
  title: "CAR List",
  description: "Browse and filter all Corrective Action Requests by status, department, and assignee.",
  robots: { index: false, follow: false },
};

export default async function CarListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;

  // Parse filters from searchParams
  const filters: CarFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    status: params.status
      ? Array.isArray(params.status)
        ? params.status
        : [params.status]
      : undefined,
    sourceId: typeof params.sourceId === "string" ? params.sourceId : undefined,
    requesterDepartmentId:
      typeof params.requesterDepartmentId === "string"
        ? params.requesterDepartmentId
        : undefined,
    responsibleDepartmentId:
      typeof params.responsibleDepartmentId === "string"
        ? params.responsibleDepartmentId
        : undefined,
    overdue: params.overdue === "true" ? true : undefined,
    page: typeof params.page === "string" ? parseInt(params.page, 10) || 1 : 1,
    pageSize:
      typeof params.pageSize === "string"
        ? parseInt(params.pageSize, 10) || 20
        : 20,
  };

  const [result, lookups, departmentsData, t] = await Promise.all([
    getCars(filters),
    getCarLookups(),
    getCarFormDepartments(),
    getTranslations("car"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("listTitle")}
        </h1>
        <p className="text-muted-foreground">{t("listDescription")}</p>
      </div>
      <CarList
        initialData={result.items}
        initialTotal={result.total}
        initialPage={filters.page ?? 1}
        initialPageSize={filters.pageSize ?? 20}
        sources={lookups.sources}
        departments={departmentsData}
        initialFilters={filters}
      />
    </div>
  );
}
