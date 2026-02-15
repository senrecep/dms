"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/actions/notifications";
import { useNotificationStore } from "@/stores/notification-store";

const typeIcons: Record<string, string> = {
  APPROVAL_REQUEST: "📋",
  DOCUMENT_REJECTED: "❌",
  READ_ASSIGNMENT: "📖",
  REMINDER: "⏰",
  ESCALATION: "⚠️",
};

const typeTranslationKeys: Record<string, string> = {
  APPROVAL_REQUEST: "approvalRequest",
  DOCUMENT_REJECTED: "documentRejected",
  READ_ASSIGNMENT: "readAssignment",
  REMINDER: "reminder",
  ESCALATION: "escalation",
};

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedDocumentId: string | null;
  relatedDocument: {
    id: string;
    title: string;
    documentCode: string;
  } | null;
}

interface NotificationListProps {
  notifications: NotificationItem[];
  page: number;
  totalPages: number;
  total: number;
}

function getNotificationDisplay(
  notification: { title: string; message: string },
  t: ReturnType<typeof useTranslations>,
) {
  try {
    const params = JSON.parse(notification.message);
    return {
      title: t(`titles.${notification.title}` as Parameters<typeof t>[0], params),
      message: t(`messages.${notification.title}` as Parameters<typeof t>[0], params),
    };
  } catch {
    return { title: notification.title, message: notification.message };
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationList({
  notifications,
  page,
  totalPages,
  total,
}: NotificationListProps) {
  const router = useRouter();
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const markAsReadStore = useNotificationStore((s) => s.markAsRead);
  const markAllAsReadStore = useNotificationStore((s) => s.markAllAsRead);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkAsRead(id: string) {
    markAsReadStore(id);
    await markNotificationAsRead(id);
    router.refresh();
  }

  async function handleMarkAllAsRead() {
    markAllAsReadStore();
    await markAllNotificationsAsRead();
    router.refresh();
  }

  function handleNavigate(notification: NotificationItem) {
    if (notification.relatedDocumentId) {
      if (!notification.isRead) {
        handleMarkAsRead(notification.id);
      }
      router.push(`/documents/${notification.relatedDocumentId}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            {t("title")}
            {total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {total}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="mr-1 size-4" />
              {t("markAllRead")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="mb-3 size-10 opacity-40" />
            <p className="text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => {
              const display = getNotificationDisplay(notification, t);
              return (
              <div
                key={notification.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50 ${
                  !notification.isRead ? "bg-primary/5" : ""
                }`}
                onClick={() => handleNavigate(notification)}
              >
                <span className="mt-0.5 text-lg">
                  {typeIcons[notification.type] ?? "🔔"}
                </span>
                <div className="flex-1 space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm ${!notification.isRead ? "font-semibold" : ""}`}
                    >
                      {display.title}
                    </p>
                    {!notification.isRead && (
                      <span className="size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {display.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground/70">
                    <Badge variant="outline" className="text-[10px]">
                      {t(`types.${typeTranslationKeys[notification.type] ?? "approvalRequest"}`)}
                    </Badge>
                    {notification.relatedDocument && (
                      <span className="font-mono text-[11px]">
                        {notification.relatedDocument.documentCode}
                      </span>
                    )}
                    <span className="text-[11px]">{formatDate(notification.createdAt)}</span>
                  </div>
                </div>
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                  >
                    <Check className="size-4" />
                  </Button>
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {tCommon("pagination.page")} {page} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => router.push(`/notifications?page=${page - 1}`)}
              >
                {tCommon("pagination.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => router.push(`/notifications?page=${page + 1}`)}
              >
                {tCommon("pagination.next")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
