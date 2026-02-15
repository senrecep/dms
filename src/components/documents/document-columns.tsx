"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { DocumentListItem } from "@/actions/documents";
import { StatusBadge } from "./status-badge";
import { ReadStatusIndicator } from "./read-status-indicator";
import { format } from "date-fns";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function getDocumentColumns(t: (key: string) => string): ColumnDef<DocumentListItem>[] {
  return [
    {
      accessorKey: "documentCode",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("documents.form.documentCode")}
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("documentCode")}</span>
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("documents.form.documentName")}
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate sm:max-w-[400px]">{row.getValue("title")}</span>
      ),
    },
    {
      accessorKey: "currentRevisionNo",
      meta: { className: "hidden md:table-cell" },
      header: t("common.labels.revisionNo"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          Rev.{String(row.getValue<number>("currentRevisionNo")).padStart(2, "0")}
        </span>
      ),
    },
    {
      accessorKey: "documentType",
      meta: { className: "hidden lg:table-cell" },
      header: t("common.labels.type"),
      cell: ({ row }) => {
        const type = row.getValue<string>("documentType");
        const typeKey = type.toLowerCase() as "procedure" | "instruction" | "form";
        return <span>{t(`documents.type.${typeKey}`)}</span>;
      },
    },
    {
      accessorKey: "departmentName",
      meta: { className: "hidden lg:table-cell" },
      header: t("common.labels.department"),
    },
    {
      accessorKey: "preparerName",
      meta: { className: "hidden xl:table-cell" },
      header: t("documents.form.preparer"),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue<string>("preparerName") || "-"}</span>
      ),
    },
    {
      accessorKey: "approverName",
      meta: { className: "hidden xl:table-cell" },
      header: t("documents.form.approver"),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue<string>("approverName") || "-"}</span>
      ),
    },
    {
      accessorKey: "publishedAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("common.labels.date")}
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue<Date | null>("publishedAt");
        return date ? format(date, "dd.MM.yyyy") : "-";
      },
    },
    {
      accessorKey: "status",
      header: t("common.labels.status"),
      cell: ({ row }) => {
        const status = row.getValue<string>("status");
        const previousStatus = row.original.previousRevisionStatus;
        return (
          <div className="flex flex-col gap-0.5">
            <StatusBadge status={status} />
            {previousStatus && status !== "PUBLISHED" && (
              <span className="text-muted-foreground text-[10px]">
                {t("documents.detail.previousStatus")}: {t(`documents.status.${statusToKey(previousStatus)}`)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "readStatus",
      header: t("common.labels.readStatus"),
      cell: ({ row }) => (
        <ReadStatusIndicator
          confirmed={row.original.readConfirmed}
          total={row.original.readTotal}
          status={row.original.status}
        />
      ),
    },
  ];
}

function statusToKey(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "draft",
    PENDING_APPROVAL: "pendingApproval",
    PREPARER_APPROVED: "preparerApproved",
    APPROVED: "approved",
    PUBLISHED: "published",
    PREPARER_REJECTED: "preparerRejected",
    APPROVER_REJECTED: "approverRejected",
    CANCELLED: "cancelled",
  };
  return map[status] ?? "draft";
}
