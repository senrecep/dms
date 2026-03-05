"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { getUserCarStats } from "@/actions/car-user-stats";

type UserCarStatsProps = {
  stats: Awaited<ReturnType<typeof getUserCarStats>>;
};

export function UserCarStatsTab({ stats }: UserCarStatsProps) {
  const t = useTranslations("car.userStats");
  const tActivity = useTranslations("car.activity");

  const kpis = [
    { label: t("carsAsRequester"), value: stats.carsAsRequester },
    { label: t("carsAsAssignee"), value: stats.carsAsAssignee },
    { label: t("openCars"), value: stats.openCars },
    {
      label: t("overdueCars"),
      value: stats.overdueCars,
      variant: "destructive" as const,
    },
    { label: t("actionsOwned"), value: stats.correctiveActionsOwned },
    { label: t("actionsCompleted"), value: stats.completedActions },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${kpi.variant === "destructive" && kpi.value > 0 ? "text-destructive" : ""}`}
              >
                {kpi.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentCarActivity.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noActivity")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("carCode")}</TableHead>
                  <TableHead>{t("action")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentCarActivity.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <Link
                        href={`/car/${activity.carId}`}
                        className="text-primary hover:underline"
                      >
                        {activity.carCode}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(() => {
                          const keys: Record<string, string> = { CREATED: "created", UPDATED: "updated", STATUS_CHANGED: "statusChanged", ROOT_CAUSE_ADDED: "rootCauseAdded", ROOT_CAUSE_UPDATED: "rootCauseUpdated", IMMEDIATE_ACTION_ADDED: "immediateActionAdded", IMMEDIATE_ACTION_UPDATED: "immediateActionUpdated", ACTION_ADDED: "correctiveActionAdded", ACTION_UPDATED: "correctiveActionUpdated", ACTION_COMPLETED: "actionCompleted", CLOSURE_REQUESTED: "closureRequested", CLOSED: "closed", REOPENED: "reopened", CANCELLED: "cancelled", DELETED: "deleted", ATTACHMENT_ADDED: "attachmentAdded", ATTACHMENT_DELETED: "attachmentDeleted", TEAM_MEMBER_ADDED: "teamMemberAdded", TEAM_MEMBER_REMOVED: "teamMemberRemoved" };
                          const k = keys[activity.action];
                          return k ? tActivity(k as Parameters<typeof tActivity>[0]) : activity.action;
                        })()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
