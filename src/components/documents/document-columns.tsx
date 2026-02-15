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
        <span className="max-w-[150px] truncate sm:max-w-[300px]">{row.getValue("title")}</span>
      ),
    },
    {
      accessorKey: "currentRevisionNo",
      header: t("common.labels.revisionNo"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          Rev.{String(row.getValue<number>("currentRevisionNo")).padStart(2, "0")}
        </span>
      ),
    },
    {
      accessorKey: "documentType",
      header: t("common.labels.type"),
      cell: ({ row }) => {
        const type = row.getValue<string>("documentType");
        const typeKey = type.toLowerCase() as "procedure" | "instruction" | "form";
        return <span>{t(`documents.type.${typeKey}`)}</span>;
      },
    },
    {
      accessorKey: "departmentName",
      header: t("common.labels.department"),
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
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
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
