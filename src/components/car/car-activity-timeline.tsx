"use client";

import { useTranslations } from "next-intl";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  CirclePlus,
  ArrowRight,
  CheckCircle2,
  Ban,
  Trash2,
  FileText,
  Activity,
} from "lucide-react";

type ActivityLog = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
  user: { id: string; name: string } | null;
};

type CarActivityTimelineProps = {
  activities: ActivityLog[];
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  CREATED: CirclePlus,
  UPDATED: Activity,
  STATUS_CHANGED: ArrowRight,
  ROOT_CAUSE_ADDED: Activity,
  ROOT_CAUSE_UPDATED: Activity,
  IMMEDIATE_ACTION_ADDED: Activity,
  IMMEDIATE_ACTION_UPDATED: Activity,
  ACTION_ADDED: Activity,
  ACTION_UPDATED: Activity,
  ACTION_COMPLETED: CheckCircle2,
  CLOSURE_REQUESTED: ArrowRight,
  CLOSED: CheckCircle2,
  REOPENED: ArrowRight,
  CANCELLED: Ban,
  DELETED: Trash2,
  ATTACHMENT_ADDED: FileText,
  ATTACHMENT_DELETED: Trash2,
  TEAM_MEMBER_ADDED: CirclePlus,
  TEAM_MEMBER_REMOVED: Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  CREATED: "text-blue-600",
  UPDATED: "text-blue-600",
  STATUS_CHANGED: "text-amber-600",
  ROOT_CAUSE_ADDED: "text-orange-600",
  ROOT_CAUSE_UPDATED: "text-orange-600",
  IMMEDIATE_ACTION_ADDED: "text-orange-600",
  IMMEDIATE_ACTION_UPDATED: "text-orange-600",
  ACTION_ADDED: "text-yellow-600",
  ACTION_UPDATED: "text-yellow-600",
  ACTION_COMPLETED: "text-green-600",
  CLOSURE_REQUESTED: "text-amber-600",
  CLOSED: "text-green-600",
  REOPENED: "text-blue-600",
  CANCELLED: "text-gray-600",
  DELETED: "text-red-600",
  ATTACHMENT_ADDED: "text-indigo-600",
  ATTACHMENT_DELETED: "text-red-600",
  TEAM_MEMBER_ADDED: "text-blue-600",
  TEAM_MEMBER_REMOVED: "text-red-600",
};

const ACTION_LABEL_KEYS: Record<string, string> = {
  CREATED: "activity.created",
  UPDATED: "activity.updated",
  STATUS_CHANGED: "activity.statusChanged",
  ROOT_CAUSE_ADDED: "activity.rootCauseAdded",
  ROOT_CAUSE_UPDATED: "activity.rootCauseUpdated",
  IMMEDIATE_ACTION_ADDED: "activity.immediateActionAdded",
  IMMEDIATE_ACTION_UPDATED: "activity.immediateActionUpdated",
  ACTION_ADDED: "activity.correctiveActionAdded",
  ACTION_UPDATED: "activity.correctiveActionUpdated",
  ACTION_COMPLETED: "activity.actionCompleted",
  CLOSURE_REQUESTED: "activity.closureRequested",
  CLOSED: "activity.closed",
  REOPENED: "activity.reopened",
  CANCELLED: "activity.cancelled",
  DELETED: "activity.deleted",
  ATTACHMENT_ADDED: "activity.attachmentAdded",
  ATTACHMENT_DELETED: "activity.attachmentDeleted",
  TEAM_MEMBER_ADDED: "activity.teamMemberAdded",
  TEAM_MEMBER_REMOVED: "activity.teamMemberRemoved",
};

function getDetailText(
  action: string,
  details: Record<string, unknown>,
): { type: "statusChange"; from: string; to: string } | { type: "text"; value: string } | null {
  if (action === "STATUS_CHANGED" && details.from && details.to) {
    return { type: "statusChange", from: details.from as string, to: details.to as string };
  }

  if (action === "STATUS_CHANGED" && details.rejectionComment) {
    return { type: "text", value: String(details.rejectionComment) };
  }

  if (action === "CANCELLED" && details.reason) {
    return { type: "text", value: String(details.reason) };
  }

  if (action === "CLOSED" && details.note) {
    return { type: "text", value: String(details.note) };
  }

  return null;
}

export function CarActivityTimeline({ activities }: CarActivityTimelineProps) {
  const t = useTranslations("car");

  if (activities.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        {t("noActivity")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((log) => {
        const Icon = ACTION_ICONS[log.action] ?? Activity;
        const colorClass = ACTION_COLORS[log.action] ?? "text-muted-foreground";
        const labelKey = ACTION_LABEL_KEYS[log.action];
        const detail = log.details ? getDetailText(log.action, log.details) : null;

        return (
          <div
            key={log.id}
            className="flex items-start gap-3 border-l-2 border-l-primary/20 pl-4"
          >
            <Icon className={`size-4 mt-0.5 shrink-0 ${colorClass}`} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {labelKey ? t(labelKey) : log.action}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {format(new Date(log.createdAt), "dd.MM.yyyy HH:mm")}
                </span>
                <span className="text-muted-foreground text-xs hidden sm:inline">
                  ({formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: tr })})
                </span>
              </div>
              {log.user && (
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {log.user.name}
                </p>
              )}
              {detail && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {detail.type === "statusChange"
                    ? `${t(`status.${detail.from}`)} -> ${t(`status.${detail.to}`)}`
                    : detail.value}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
