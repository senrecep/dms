"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CAR_STATUS_COLORS } from "@/lib/car/workflow";
import { Badge } from "@/components/ui/badge";

// --- Types ---

type StatusDistItem = { status: string; count: number };
type MonthlyTrendItem = { month: string; opened: number; closed: number };
type DepartmentStatItem = {
  departmentName: string;
  asRequester: number;
  asResponsible: number;
  open: number;
};
type SourceStatItem = {
  sourceName: string;
  count: number;
  avgCloseDays: number;
};
type AvgClosureData = {
  overall: number;
  trend: Array<{ month: string; avgDays: number }>;
};
type OverdueItem = {
  id: string;
  carCode: string;
  createdAt: Date;
  assigneeName: string;
  responsibleDeptName: string;
  targetDate: Date;
  daysOverdue: number;
};
type ActivityItem = {
  id: string;
  carCode: string;
  carId: string;
  action: string;
  userName: string;
  createdAt: Date;
};

type CarDashboardChartsProps = {
  statusDistribution: StatusDistItem[];
  monthlyTrend: MonthlyTrendItem[];
  departmentStats: DepartmentStatItem[];
  sourceStats: SourceStatItem[];
  averageClosure: AvgClosureData;
  overdueList: OverdueItem[];
  recentActivity: ActivityItem[];
};

// --- Color helpers ---

const STATUS_CHART_COLORS: Record<string, string> = {
  OPEN: "#3b82f6",
  ROOT_CAUSE_ANALYSIS: "#f97316",
  IMMEDIATE_ACTION: "#f59e0b",
  PLANNED_ACTION: "#8b5cf6",
  ACTION_RESULTS: "#06b6d4",
  PENDING_CLOSURE: "#a855f7",
  CLOSED: "#22c55e",
  CANCELLED: "#6b7280",
};

// --- Sub-Components ---

function StatusDistributionChart({
  data,
}: {
  data: StatusDistItem[];
}) {
  const t = useTranslations("car");
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground py-4 text-center">{t("dashboard.noData")}</p>;

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const pct = Math.round((item.count / total) * 100);
        const color = STATUS_CHART_COLORS[item.status] ?? "#6b7280";
        return (
          <div key={item.status} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{t(`status.${item.status}`)}</span>
              </div>
              <span className="font-medium">
                {item.count} ({pct}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyTrendChart({ data }: { data: MonthlyTrendItem[] }) {
  const t = useTranslations("car.dashboard");
  const maxVal = Math.max(...data.flatMap((d) => [d.opened, d.closed]), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-blue-500" />
          {t("opened")}
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-green-500" />
          {t("closed")}
        </div>
      </div>
      <div className="flex items-end gap-1 h-40">
        {data.map((item) => {
          const shortMonth = item.month.slice(5);
          return (
            <div
              key={item.month}
              className="flex flex-1 flex-col items-center gap-0.5"
            >
              <div className="flex w-full items-end justify-center gap-0.5 flex-1">
                <div
                  className="w-2 sm:w-3 rounded-t bg-blue-500 transition-all duration-500"
                  style={{
                    height: `${Math.max((item.opened / maxVal) * 100, 2)}%`,
                  }}
                  title={`${t("opened")}: ${item.opened}`}
                />
                <div
                  className="w-2 sm:w-3 rounded-t bg-green-500 transition-all duration-500"
                  style={{
                    height: `${Math.max((item.closed / maxVal) * 100, 2)}%`,
                  }}
                  title={`${t("closed")}: ${item.closed}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {shortMonth}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DepartmentStatsChart({ data }: { data: DepartmentStatItem[] }) {
  const t = useTranslations("car.dashboard");
  const maxVal = Math.max(
    ...data.flatMap((d) => [d.asRequester, d.asResponsible]),
    1,
  );

  if (data.length === 0)
    return <p className="text-sm text-muted-foreground py-4 text-center">{t("noData")}</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-blue-500" />
          {t("asRequester")}
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm bg-orange-500" />
          {t("asResponsible")}
        </div>
      </div>
      {data.map((item) => (
        <div key={item.departmentName} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate max-w-[200px]">{item.departmentName}</span>
            <span className="text-xs text-muted-foreground">
              {item.asRequester + item.asResponsible}
            </span>
          </div>
          <div className="flex gap-0.5">
            <div
              className="h-3 rounded-l bg-blue-500 transition-all duration-500"
              style={{
                width: `${Math.max((item.asRequester / maxVal) * 50, 1)}%`,
              }}
              title={`${t("asRequester")}: ${item.asRequester}`}
            />
            <div
              className="h-3 rounded-r bg-orange-500 transition-all duration-500"
              style={{
                width: `${Math.max((item.asResponsible / maxVal) * 50, 1)}%`,
              }}
              title={`${t("asResponsible")}: ${item.asResponsible}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceDistributionChart({ data }: { data: SourceStatItem[] }) {
  const t = useTranslations("car.dashboard");
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground py-4 text-center">{t("noData")}</p>;

  const colors = [
    "#3b82f6",
    "#f97316",
    "#22c55e",
    "#a855f7",
    "#06b6d4",
    "#ef4444",
    "#eab308",
    "#ec4899",
  ];

  return (
    <div className="space-y-3">
      {/* Simple donut visualization via stacked bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {data.map((item, i) => {
          const pct = (item.count / total) * 100;
          return (
            <div
              key={item.sourceName}
              className="h-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: colors[i % colors.length],
              }}
              title={`${item.sourceName}: ${item.count} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {data.map((item, i) => (
          <div key={item.sourceName} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block size-3 shrink-0 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="truncate">{item.sourceName}</span>
            <span className="ml-auto font-medium">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AvgClosureTimeCard({ data }: { data: AvgClosureData }) {
  const t = useTranslations("car.dashboard");
  const maxDays = Math.max(...data.trend.map((d) => d.avgDays), 1);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl font-bold">{data.overall}</div>
        <div className="text-sm text-muted-foreground">
          {t("avgClosureDays", { days: data.overall })}
        </div>
      </div>
      {/* Mini trend line */}
      <div className="flex items-end justify-center gap-2 h-16">
        {data.trend.map((item) => (
          <div key={item.month} className="flex flex-col items-center gap-1">
            <div
              className="w-6 rounded-t bg-blue-500/80 transition-all duration-500"
              style={{
                height: `${Math.max((item.avgDays / maxDays) * 100, 4)}%`,
              }}
              title={`${item.month}: ${item.avgDays} days`}
            />
            <span className="text-[10px] text-muted-foreground">
              {item.month.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverdueTable({ data }: { data: OverdueItem[] }) {
  const t = useTranslations("car.dashboard");

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t("noOverdue")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("carCode")}</TableHead>
            <TableHead className="hidden sm:table-cell">
              {t("assignee")}
            </TableHead>
            <TableHead className="hidden md:table-cell">
              {t("responsibleDept")}
            </TableHead>
            <TableHead>{t("targetDate")}</TableHead>
            <TableHead className="text-right">{t("daysOverdue")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item.id}
              className={`cursor-pointer hover:bg-muted/50${item.daysOverdue > 30 ? " bg-red-50 dark:bg-red-950/30" : ""}`}
              onClick={() => { window.location.href = `/car/${item.id}`; }}
            >
              <TableCell>
                <Link
                  href={`/car/${item.id}`}
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.carCode}
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {item.assigneeName}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {item.responsibleDeptName}
              </TableCell>
              <TableCell>
                {format(new Date(item.targetDate), "dd.MM.yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant={item.daysOverdue > 30 ? "destructive" : "secondary"}
                >
                  {item.daysOverdue} {t("daysLabel")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const ACTIVITY_LABEL_KEYS: Record<string, string> = {
  CREATED: "created",
  UPDATED: "updated",
  STATUS_CHANGED: "statusChanged",
  ROOT_CAUSE_ADDED: "rootCauseAdded",
  ROOT_CAUSE_UPDATED: "rootCauseUpdated",
  IMMEDIATE_ACTION_ADDED: "immediateActionAdded",
  IMMEDIATE_ACTION_UPDATED: "immediateActionUpdated",
  ACTION_ADDED: "correctiveActionAdded",
  ACTION_UPDATED: "correctiveActionUpdated",
  ACTION_COMPLETED: "actionCompleted",
  CLOSURE_REQUESTED: "closureRequested",
  CLOSED: "closed",
  REOPENED: "reopened",
  CANCELLED: "cancelled",
  DELETED: "deleted",
  ATTACHMENT_ADDED: "attachmentAdded",
  ATTACHMENT_DELETED: "attachmentDeleted",
  TEAM_MEMBER_ADDED: "teamMemberAdded",
  TEAM_MEMBER_REMOVED: "teamMemberRemoved",
};

function RecentActivityList({ data }: { data: ActivityItem[] }) {
  const t = useTranslations("car.dashboard");
  const tActivity = useTranslations("car.activity");

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">{t("noData")}</p>
    );
  }

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {data.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-2 border-b pb-3 last:border-0 last:pb-0"
        >
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium">{item.userName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {ACTIVITY_LABEL_KEYS[item.action]
                ? tActivity(ACTIVITY_LABEL_KEYS[item.action] as Parameters<typeof tActivity>[0])
                : item.action.replace(/_/g, " ")}{" "}
              -{" "}
              <Link
                href={`/car/${item.carId}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {item.carCode}
              </Link>
            </p>
          </div>
          <time className="shrink-0 text-xs text-muted-foreground">
            {new Date(item.createdAt).toLocaleDateString()}
          </time>
        </div>
      ))}
    </div>
  );
}

function SourceAvgClosureTable({ data }: { data: SourceStatItem[] }) {
  const t = useTranslations("car.dashboard");

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">{t("noData")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("sourceName")}</TableHead>
            <TableHead className="text-right">{t("count")}</TableHead>
            <TableHead className="text-right">{t("avgDays")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.sourceName}>
              <TableCell className="font-medium">{item.sourceName}</TableCell>
              <TableCell className="text-right">{item.count}</TableCell>
              <TableCell className="text-right">
                {item.avgCloseDays > 0 ? item.avgCloseDays : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// --- Main Component ---

export function CarDashboardCharts({
  statusDistribution,
  monthlyTrend,
  departmentStats,
  sourceStats,
  averageClosure,
  overdueList,
  recentActivity,
}: CarDashboardChartsProps) {
  const t = useTranslations("car.dashboard");

  return (
    <div className="space-y-6">
      {/* Row 1: Status + Monthly Trend */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("statusDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDistributionChart data={statusDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("monthlyTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={monthlyTrend} />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Department Stats + Source Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("departmentStats")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DepartmentStatsChart data={departmentStats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("sourceDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SourceDistributionChart data={sourceStats} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Avg Closure Time + Source Avg Closure Table */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("avgClosureTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AvgClosureTimeCard data={averageClosure} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("sourceAvgClosure")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SourceAvgClosureTable data={sourceStats} />
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Overdue List (full width) */}
      <Card>
        <CardHeader>
          <CardTitle>{t("overdueList")}</CardTitle>
          <CardDescription>
            {overdueList.length > 0
              ? `${overdueList.length} ${t("overdueItems")}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OverdueTable data={overdueList} />
        </CardContent>
      </Card>

      {/* Row 5: Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityList data={recentActivity} />
        </CardContent>
      </Card>
    </div>
  );
}
