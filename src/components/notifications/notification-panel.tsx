"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, Check, CheckCheck, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useNotificationStore } from "@/stores/notification-store";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/actions/notifications";

const typeIcons: Record<string, string> = {
  APPROVAL_REQUEST: "📋",
  DOCUMENT_REJECTED: "❌",
  READ_ASSIGNMENT: "📖",
  REMINDER: "⏰",
  ESCALATION: "⚠️",
};

function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
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

export function NotificationPanel() {
  const router = useRouter();
  const t = useTranslations("notifications");
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAsReadStore = useNotificationStore((s) => s.markAsRead);
  const markAllAsReadStore = useNotificationStore((s) => s.markAllAsRead);

  async function handleMarkAsRead(id: string) {
    markAsReadStore(id);
    try {
      await markNotificationAsRead(id);
    } catch {
      // store already updated optimistically
    }
  }

  async function handleMarkAllAsRead() {
    markAllAsReadStore();
    try {
      await markAllNotificationsAsRead();
    } catch {
      // store already updated optimistically
    }
  }

  function handleNavigate(notification: (typeof notifications)[0]) {
    const docId = (notification.metadata as { relatedDocumentId?: string })
      ?.relatedDocumentId;
    if (docId) {
      if (!notification.read) {
        handleMarkAsRead(notification.id);
      }
      router.push(`/documents/${docId}`);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="text-sm font-semibold">{t("title")}</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="mr-1 size-3" />
              {t("markAllRead")}
            </Button>
          )}
        </div>
        <Separator />

        {/* Notification List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="mb-2 size-8 opacity-40" />
              <p className="text-sm">{t("empty")}</p>
            </div>
          ) : (
            <div>
              {notifications.slice(0, 10).map((notification) => {
                const display = getNotificationDisplay(notification, t);
                return (
                <div
                  key={notification.id}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNavigate(notification)}
                >
                  <span className="mt-0.5 text-base">
                    {typeIcons[notification.type] ?? "🔔"}
                  </span>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    <div className="flex items-start gap-2">
                      <p
                        className={`text-sm ${!notification.read ? "font-semibold" : ""}`}
                      >
                        {display.title}
                      </p>
                      {!notification.read && (
                        <span className="size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {display.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                    >
                      <Check className="size-3.5" />
                    </Button>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center gap-1 text-xs"
                size="sm"
                onClick={() => router.push("/notifications")}
              >
                <ExternalLink className="size-3" />
                {t("viewAll")}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
