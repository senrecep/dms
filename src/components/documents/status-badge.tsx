"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
  INTERMEDIATE_APPROVAL: "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  PUBLISHED: "bg-primary/10 text-primary border-primary/20",
  REVISION: "bg-orange-50 text-orange-700 border-orange-200",
  PASSIVE: "bg-gray-50 text-gray-500 border-gray-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200 line-through",
};

const statusKeys: Record<string, string> = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pendingApproval",
  INTERMEDIATE_APPROVAL: "intermediateApproval",
  APPROVED: "approved",
  PUBLISHED: "published",
  REVISION: "revision",
  PASSIVE: "passive",
  CANCELLED: "cancelled",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("documents.status");
  const className = statusStyles[status] ?? "bg-gray-100 text-gray-700";
  const key = statusKeys[status];
  const label = key ? t(key) : status;

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", className)}>
      {label}
    </Badge>
  );
}
