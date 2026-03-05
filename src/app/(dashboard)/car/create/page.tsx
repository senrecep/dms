import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CarForm } from "@/components/car/car-form";
import {
  suggestCarCode,
  getCarLookups,
  getCarFormUsers,
  getCarFormDepartments,
  getUserDepartmentId,
} from "@/actions/car";

export const metadata: Metadata = {
  title: "Create CAR",
  description: "Create a new Corrective Action Request - define nonconformity, assign responsible department, and set target dates.",
  robots: { index: false, follow: false },
};

export default async function CarCreatePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const t = await getTranslations("car");

  const [lookups, usersData, departmentsData, suggestedCode, userDepartmentId] =
    await Promise.all([
      getCarLookups(),
      getCarFormUsers(),
      getCarFormDepartments(),
      suggestCarCode(),
      getUserDepartmentId(session.user.id),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("createTitle")}
        </h1>
        <p className="text-muted-foreground">{t("createDescription")}</p>
      </div>
      <CarForm
        sources={lookups.sources}
        systems={lookups.systems}
        processes={lookups.processes}
        customers={lookups.customers}
        products={lookups.products}
        operations={lookups.operations}
        users={usersData}
        departments={departmentsData}
        currentUserDepartmentId={userDepartmentId}
        suggestedCode={suggestedCode}
      />
    </div>
  );
}
