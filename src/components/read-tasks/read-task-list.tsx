"use client";

import Link from "next/link";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReadConfirmButton } from "@/components/read-tasks/read-confirm-button";
import { useTranslations } from "next-intl";

interface ReadTaskRevision {
  id: string;
  title: string;
  documentType: "PROCEDURE" | "INSTRUCTION" | "FORM";
  publishedAt: Date | null;
  createdById: string;
  documentId: string;
  document: {
    id: string;
    documentCode: string;
  };
  createdBy: {
    id: string;
    name: string;
  };
}

export interface ReadTask {
  id: string;
  revisionId: string;
  userId: string;
  confirmedAt: Date | null;
  createdAt: Date;
  revision: ReadTaskRevision;
}

interface ReadTaskListProps {
  tasks: ReadTask[];
  showConfirmButton?: boolean;
}

const typeVariants: Record<string, "default" | "secondary" | "outline"> = {
  PROCEDURE: "default",
  INSTRUCTION: "secondary",
  FORM: "outline",
};

function formatDate(date: Date | string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReadTaskList({ tasks, showConfirmButton = false }: ReadTaskListProps) {
  const t = useTranslations();

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t("readTasks.empty")}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-tight">
                <Link
                  href={`/documents/${task.revision.documentId}`}
                  className="hover:underline"
                >
                  {task.revision.title}
                </Link>
              </CardTitle>
              <Badge variant={typeVariants[task.revision.documentType]}>
                {t(`documents.type.${task.revision.documentType.toLowerCase()}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>{t("documents.form.documentCode")}</span>
                <span className="font-mono">{task.revision.document.documentCode}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("common.labels.publishedBy")}</span>
                <span>{task.revision.createdBy.name}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("common.labels.date")}</span>
                <span>{formatDate(task.revision.publishedAt ?? task.createdAt)}</span>
              </div>
              {task.confirmedAt && (
                <div className="flex items-center justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    {t("readTasks.readAt")}
                  </span>
                  <span>{formatDate(task.confirmedAt)}</span>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button asChild variant="outline" size="sm" className="gap-1">
                <Link href={`/documents/${task.revision.documentId}`}>
                  <ExternalLink className="size-3.5" />
                  {t("common.actions.view")}
                </Link>
              </Button>
              {showConfirmButton && <ReadConfirmButton revisionId={task.revisionId} />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
