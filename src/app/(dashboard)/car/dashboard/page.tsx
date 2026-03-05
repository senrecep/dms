import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getCarDashboardStats,
  getCarStatusDistribution,
  getCarMonthlyTrend,
  getCarByDepartmentStats,
  getCarBySourceStats,
  getCarAverageClosureTime,
  getCarOverdueList,
  getCarRecentActivity,
} from "@/actions/car-dashboard";
import { CarDashboardStats } from "@/components/car/car-dashboard-stats";
import { CarDashboardCharts } from "@/components/car/car-dashboard-charts";

export const metadata: Metadata = {
  title: "CAR Dashboard",
  description: "Corrective Action Request dashboard - track open CARs, overdue items, and performance statistics.",
  robots: { index: false, follow: false },
};

export default async function CarDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const t = await getTranslations("car.dashboard");

  // Fetch all dashboard data in parallel
  const [
    stats,
    statusDist,
    monthlyTrend,
    deptStats,
    sourceStats,
    avgClosure,
    overdueList,
    recentActivity,
  ] = await Promise.all([
    getCarDashboardStats(),
    getCarStatusDistribution(),
    getCarMonthlyTrend(),
    getCarByDepartmentStats(),
    getCarBySourceStats(),
    getCarAverageClosureTime(),
    getCarOverdueList(),
    getCarRecentActivity(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <CarDashboardStats stats={stats} />
      <CarDashboardCharts
        statusDistribution={statusDist}
        monthlyTrend={monthlyTrend}
        departmentStats={deptStats}
        sourceStats={sourceStats}
        averageClosure={avgClosure}
        overdueList={overdueList}
        recentActivity={recentActivity}
      />
    </div>
  );
}
