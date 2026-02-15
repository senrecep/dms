"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApprovalActions } from "@/components/approvals/approval-actions";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface ApprovalRevision {
  id: string;
  title: string;
  documentType: "PROCEDURE" | "INSTRUCTION" | "FORM";
  createdById: string;
  createdAt: Date;
  documentId: string;
  document: {
    id: string;
    documentCode: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ApprovalRow {
  id: string;
  revisionId: string;
  approverId: string;
  approvalType: "PREPARER" | "APPROVER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  comment: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  revision: ApprovalRevision;
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
};

const typeVariants: Record<string, "default" | "secondary" | "outline"> = {
  PROCEDURE: "default",
  INSTRUCTION: "secondary",
  FORM: "outline",
};

export function usePendingColumns(): ColumnDef<ApprovalRow>[] {
  const t = useTranslations();

  return [
    {
      accessorKey: "revision.document.documentCode",
      header: t("documents.form.documentCode"),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.revision.document.documentCode}
        </span>
      ),
    },
    {
      accessorKey: "revision.title",
      header: t("documents.form.documentName"),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate font-medium sm:max-w-[400px]">
          {row.original.revision.title}
        </div>
      ),
    },
    {
      accessorKey: "revision.documentType",
      header: t("common.labels.type"),
      cell: ({ row }) => {
        const type = row.original.revision.documentType;
        return (
          <Badge variant={typeVariants[type]}>
            {t(`documents.type.${type.toLowerCase()}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "approvalType",
      header: t("common.labels.approvalType"),
      cell: ({ row }) => (
        <Badge variant={row.original.approvalType === "APPROVER" ? "default" : "secondary"}>
          {t(`approvals.type.${row.original.approvalType.toLowerCase()}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "revision.createdBy.name",
      header: t("common.labels.requestedBy"),
      cell: ({ row }) => row.original.revision.createdBy.name,
    },
    {
      accessorKey: "createdAt",
      header: t("common.labels.createdAt"),
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: t("common.labels.actions"),
      cell: ({ row }) => <ApprovalActions approval={row.original} />,
    },
  ];
}

export function useCompletedColumns(): ColumnDef<ApprovalRow>[] {
  const t = useTranslations();

  return [
    {
      accessorKey: "revision.document.documentCode",
      header: t("documents.form.documentCode"),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.revision.document.documentCode}
        </span>
      ),
    },
    {
      accessorKey: "revision.title",
      header: t("documents.form.documentName"),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate font-medium sm:max-w-[400px]">
          {row.original.revision.title}
        </div>
      ),
    },
    {
      accessorKey: "revision.documentType",
      header: t("common.labels.type"),
      cell: ({ row }) => {
        const type = row.original.revision.documentType;
        return (
          <Badge variant={typeVariants[type]}>
            {t(`documents.type.${type.toLowerCase()}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: t("common.labels.status"),
      cell: ({ row }) => (
        <Badge variant={statusVariants[row.original.status]}>
          {t(`approvals.status.${row.original.status.toLowerCase()}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "revision.createdBy.name",
      header: t("common.labels.requestedBy"),
      cell: ({ row }) => row.original.revision.createdBy.name,
    },
    {
      accessorKey: "respondedAt",
      header: t("common.labels.respondedAt"),
      cell: ({ row }) =>
        row.original.respondedAt
          ? formatDate(row.original.respondedAt)
          : "-",
    },
    {
      accessorKey: "comment",
      header: t("approvals.form.rejectionReason"),
      cell: ({ row }) => (
        <div className="max-w-[100px] truncate text-sm text-muted-foreground sm:max-w-[200px]">
          {row.original.comment ?? "-"}
        </div>
      ),
    },
    {
      id: "actions",
      header: t("common.labels.actions"),
      cell: ({ row }) => (
        <Button asChild size="sm" variant="outline" className="gap-1">
          <Link href={`/documents/${row.original.revision.documentId}`}>
            <ExternalLink className="size-3.5" />
            {t("common.actions.viewDetails")}
          </Link>
        </Button>
      ),
    },
  ];
}
