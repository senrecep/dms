"use client";

import {
  ClipboardList,
  AlertCircle,
  Clock,
  Hourglass,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

type DashboardStats = {
  total: number;
  open: number;
  overdue: number;
  pendingClosure: number;
  closedThisMonth: number;
};

export function CarDashboardStats({ stats }: { stats: DashboardStats }) {
  const t = useTranslations("car.dashboard");

  const cards = [
    {
      title: t("totalCars"),
      value: stats.total,
      icon: ClipboardList,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: t("openCars"),
      value: stats.open,
      icon: AlertCircle,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      title: t("overdueCars"),
      value: stats.overdue,
      icon: Clock,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      title: t("pendingClosure"),
      value: stats.pendingClosure,
      icon: Hourglass,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: t("closedThisMonth"),
      value: stats.closedThisMonth,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card, index) => (
        <Card key={card.title} className={`transition-shadow hover:shadow-md${index === 4 ? " col-span-2 sm:col-span-1" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`rounded-md p-2 ${card.bgColor}`}>
              <card.icon className={`size-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
