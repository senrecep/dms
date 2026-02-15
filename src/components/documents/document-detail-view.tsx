"use client";

import type { DocumentDetail } from "@/actions/documents";
import { cancelDocument, publishDocument } from "@/actions/documents";
import { StatusBadge } from "./status-badge";
import { ReadStatusIndicator } from "./read-status-indicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import {
  FileText,
  User,
  Building2,
  Calendar,
  ArrowLeft,
  Ban,
  Send,
  Pencil,
  Download,
  BookOpenCheck,
} from "lucide-react";
import Link from "next/link";

type Props = {
  document: DocumentDetail;
};

export function DocumentDetailView({ document: doc }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await cancelDocument(doc.id);
      toast.success(t("documents.toast.cancelled"));
      router.refresh();
    } catch {
      toast.error(t("documents.toast.cancelFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      await publishDocument(doc.id);
      toast.success(t("documents.toast.published"));
      router.refresh();
    } catch {
      toast.error(t("documents.toast.publishFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const readConfirmed = doc.readConfirmations.filter((rc) => rc.confirmedAt !== null).length;
  const readTotal = doc.readConfirmations.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="size-4" />
            </Button>
            <h2 className="text-xl font-semibold">{doc.title}</h2>
            <StatusBadge status={doc.status} />
          </div>
          <p className="text-muted-foreground ml-10 text-sm">
            {doc.documentCode} &middot; Rev.{String(doc.currentRevisionNo).padStart(2, "0")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {doc.revisions.length > 0 && (
            <Button asChild size="sm" variant="outline" className="gap-1">
              <a
                href={`/api/files/${doc.revisions[0].filePath}`}
                download={doc.revisions[0].fileName}
              >
                <Download className="size-4" />
                {t("common.actions.download")}
              </a>
            </Button>
          )}
          {doc.status === "APPROVED" && (
            <Button size="sm" onClick={handlePublish} disabled={isLoading} className="gap-1">
              <Send className="size-4" />
              {t("documents.actions.publish")}
            </Button>
          )}
          {doc.status !== "CANCELLED" && doc.status !== "PUBLISHED" && (
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link href={`/documents/${doc.id}/revise`}>
                <Pencil className="size-4" />
                {t("documents.actions.revise")}
              </Link>
            </Button>
          )}
          {doc.status !== "CANCELLED" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              className="gap-1"
            >
              <Ban className="size-4" />
              {t("documents.actions.cancel")}
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className={`grid gap-4 ${doc.status === "PUBLISHED" ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Building2 className="text-muted-foreground size-5" />
            <div>
              <p className="text-muted-foreground text-xs">{t("common.labels.department")}</p>
              <p className="text-sm font-medium">{doc.department.name}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <User className="text-muted-foreground size-5" />
            <div>
              <p className="text-muted-foreground text-xs">{t("common.labels.uploadedBy")}</p>
              <p className="text-sm font-medium">{doc.uploadedBy.name}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="text-muted-foreground size-5" />
            <div>
              <p className="text-muted-foreground text-xs">{t("common.labels.createdAt")}</p>
              <p className="text-sm font-medium">{format(doc.createdAt, "dd.MM.yyyy HH:mm")}</p>
            </div>
          </CardContent>
        </Card>
        {doc.status === "PUBLISHED" && readTotal > 0 && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <BookOpenCheck className={`size-5 ${readConfirmed === readTotal ? "text-green-600" : readConfirmed > 0 ? "text-amber-500" : "text-red-500"}`} />
              <div>
                <p className="text-muted-foreground text-xs">{t("common.labels.readStatus")}</p>
                <p className={`text-sm font-medium ${readConfirmed === readTotal ? "text-green-600" : readConfirmed > 0 ? "text-amber-500" : "text-red-500"}`}>
                  {readConfirmed}/{readTotal}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {doc.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs mb-1">{t("common.labels.description")}</p>
            <p className="text-sm">{doc.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="revisions">
        <TabsList>
          <TabsTrigger value="revisions">{t("documents.detail.revisionHistory")}</TabsTrigger>
          <TabsTrigger value="approvals">{t("documents.detail.approvalHistory")}</TabsTrigger>
          <TabsTrigger value="distribution">{t("documents.detail.distributionStatus")}</TabsTrigger>
          <TabsTrigger value="activity">{t("documents.detail.activityLog")}</TabsTrigger>
        </TabsList>

        {/* Revisions Tab */}
        <TabsContent value="revisions">
          <Card>
            <CardContent className="pt-6">
              {doc.revisions.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("documents.detail.noRevisions")}</p>
              ) : (
                <div className="space-y-4">
                  {doc.revisions.map((rev) => (
                    <div key={rev.id} className="flex items-start gap-4 rounded-lg border p-4">
                      <FileText className="text-muted-foreground mt-0.5 size-5" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Rev.{String(rev.revisionNo).padStart(2, "0")} &mdash; {rev.fileName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {format(rev.createdAt, "dd.MM.yyyy HH:mm")}
                            </span>
                            <a
                              href={`/api/files/${rev.filePath}`}
                              download={rev.fileName}
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted transition-colors"
                            >
                              <Download className="size-3" />
                              {t("common.actions.download")}
                            </a>
                          </div>
                        </div>
                        {rev.changes && <p className="text-muted-foreground text-sm">{rev.changes}</p>}
                        <p className="text-muted-foreground text-xs">{t("common.labels.uploadedBy")}: {rev.createdBy.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals">
          <Card>
            <CardContent className="pt-6">
              {doc.approvals.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("documents.detail.noApprovals")}</p>
              ) : (
                <div className="space-y-4">
                  {doc.approvals.map((appr) => (
                    <div key={appr.id} className="flex items-start gap-4 rounded-lg border p-4">
                      <User className="text-muted-foreground mt-0.5 size-5" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{appr.approver.name}</span>
                          <Badge
                            variant={
                              appr.status === "APPROVED"
                                ? "default"
                                : appr.status === "REJECTED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {t(`approvals.status.${appr.status.toLowerCase()}`)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {t("common.labels.approvalType")}: {t(`approvals.type.${appr.approvalType.toLowerCase()}`)}
                        </p>
                        {appr.comment && <p className="text-sm">{appr.comment}</p>}
                        {appr.respondedAt && (
                          <p className="text-muted-foreground text-xs">
                            {t("common.labels.respondedAt")}: {format(appr.respondedAt, "dd.MM.yyyy HH:mm")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t("common.labels.readStatus")}:</span>
                  <ReadStatusIndicator confirmed={readConfirmed} total={readTotal} status={doc.status} />
                </div>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium">{t("documents.detail.distributionDepartments")}</p>
                  {doc.distributionLists.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("documents.detail.noDistribution")}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {doc.distributionLists.map((dl) => (
                        <Badge key={dl.id} variant="outline">
                          <Building2 className="mr-1 size-3" />
                          {dl.department.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {doc.distributionUsers && doc.distributionUsers.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-sm font-medium">{t("documents.detail.distributionUsers")}</p>
                      <div className="flex flex-wrap gap-2">
                        {doc.distributionUsers.map((du) => (
                          <Badge key={du.id} variant="outline">
                            <User className="mr-1 size-3" />
                            {du.user.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {doc.readConfirmations.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-sm font-medium">{t("documents.detail.readConfirmations")}</p>
                      <div className="space-y-2">
                        {doc.readConfirmations.map((rc) => (
                          <div key={rc.id} className="flex items-center justify-between rounded border px-3 py-2">
                            <span className="text-sm">{rc.user.name}</span>
                            {rc.confirmedAt ? (
                              <span className="text-xs text-green-600">
                                {t("readTasks.readAt")}: {format(rc.confirmedAt, "dd.MM.yyyy HH:mm")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">{t("common.labels.notRead")}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-6">
              {doc.activityLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("documents.detail.noActivity")}</p>
              ) : (
                <div className="space-y-3">
                  {doc.activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 border-l-2 border-l-primary/20 pl-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {log.action}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {format(log.createdAt, "dd.MM.yyyy HH:mm")}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {t("common.labels.uploadedBy")}: {log.user.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
