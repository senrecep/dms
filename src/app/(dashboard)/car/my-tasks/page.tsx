import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getMyAssignedCars,
  getMyAssignedActions,
  getMyPendingClosures,
} from "@/actions/car-dashboard";
import { CarMyTasksView } from "@/components/car/car-my-tasks-view";

export const metadata: Metadata = {
  title: "My CAR Tasks",
  description: "View and manage your assigned Corrective Action Request tasks and pending actions.",
  robots: { index: false, follow: false },
};

export default async function CarMyTasksPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const t = await getTranslations("car.myTasks");

  const [assignedCars, assignedActions, pendingClosures] = await Promise.all([
    getMyAssignedCars(),
    getMyAssignedActions(),
    getMyPendingClosures(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <CarMyTasksView
        assignedCars={assignedCars}
        assignedActions={assignedActions}
        pendingClosures={pendingClosures}
      />
    </div>
  );
}
