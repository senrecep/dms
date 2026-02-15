import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FileText, Clock, BookOpen, Users } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardStats, getRecentActivity, getPendingTasks } from "@/actions/dashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  const stats = await getDashboardStats();
  const recentActivity = await getRecentActivity();
  const pendingTasks = await getPendingTasks();

  const statCards = [
    {
      title: t("stats.totalDocuments"),
      value: stats.totalDocuments,
      icon: FileText,
      href: "/documents",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: t("stats.pendingApprovals"),
      value: stats.pendingApprovals,
      icon: Clock,
      href: "/approvals",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: t("stats.unreadDocuments"),
      value: stats.unreadDocuments,
      icon: BookOpen,
      href: "/read-tasks",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: t("stats.activeUsers"),
      value: stats.activeUsers,
      icon: Users,
      href: "/users",
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("welcome")}, {session.user.name}
        </h1>
        <p className="text-muted-foreground">{t("title")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`rounded-md p-2 ${card.bgColor}`}>
                  <card.icon className={`size-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity.title")}</CardTitle>
            <CardDescription>
              {recentActivity.length} {tCommon("labels.actions").toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("recentActivity.empty")}
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between gap-2 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {activity.userName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.action} - {activity.documentCode}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("pendingTasks.title")}</CardTitle>
            <CardDescription>
              {stats.pendingApprovals + stats.unreadDocuments}{" "}
              {tCommon("labels.actions").toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTasks.pendingApprovals.length === 0 &&
            pendingTasks.unreadDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("pendingTasks.empty")}
              </p>
            ) : (
              <div className="space-y-4">
                {pendingTasks.pendingApprovals.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                      <Clock className="size-4" />
                      {t("stats.pendingApprovals")} ({stats.pendingApprovals})
                    </div>
                    {pendingTasks.pendingApprovals.map((item) => (
                      <Link
                        key={item.id}
                        href={`/documents/${item.documentId}`}
                        className="flex items-center justify-between rounded-md border p-2.5 transition-colors hover:bg-muted"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.documentTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.documentCode}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {pendingTasks.unreadDocuments.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                      <BookOpen className="size-4" />
                      {t("stats.unreadDocuments")} ({stats.unreadDocuments})
                    </div>
                    {pendingTasks.unreadDocuments.map((item) => (
                      <Link
                        key={item.id}
                        href={`/documents/${item.documentId}`}
                        className="flex items-center justify-between rounded-md border p-2.5 transition-colors hover:bg-muted"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.documentTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.documentCode}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
