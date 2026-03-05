"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CarStatusBadge } from "@/components/car/car-status-badge";
import { CarWorkflowStepper } from "@/components/car/car-workflow-stepper";
import { CarActivityTimeline } from "@/components/car/car-activity-timeline";
import { CarRootCauseSection } from "@/components/car/car-root-cause-section";
import { CarImmediateActionSection } from "@/components/car/car-immediate-action-section";
import { CarCorrectiveActionsTable } from "@/components/car/car-corrective-actions-table";
import {
  advanceCarStatus,
  closeCar,
  rejectCarClosure,
  cancelCar,
} from "@/actions/car-workflow";
import { deleteCar } from "@/actions/car";
import { isTerminalStatus, getNextStatus } from "@/lib/car/workflow";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  Calendar,
  User,
  Building2,
  FileText,
  Download,
  AlertTriangle,
  Pencil,
  ClipboardList,
  Target,
  Wrench,
  Activity,
  Lock,
  DollarSign,
  Users,
  Printer,
  Loader2,
  Info,
} from "lucide-react";
import Link from "next/link";

type CarDetail = NonNullable<
  Awaited<ReturnType<typeof import("@/actions/car").getCarById>>
>;

type UserItem = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  departmentName?: string | null;
};

type CarDetailViewProps = {
  car: CarDetail;
  canClose: boolean;
  isAssignee: boolean;
  isRequester: boolean;
  isAdmin: boolean;
  currentUserId: string;
  users: UserItem[];
};

export function CarDetailView({
  car,
  canClose,
  isAssignee,
  isRequester,
  isAdmin,
  currentUserId,
  users,
}: CarDetailViewProps) {
  const t = useTranslations();
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Dialog states
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [closingNote, setClosingNote] = useState("");
  const [rejectionComment, setRejectionComment] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: t("settings.users.roleAdmin"),
    MANAGER: t("settings.users.roleManager"),
    USER: t("settings.users.roleUser"),
  };

  function userSubtitle(role?: string, dept?: string | null): string | undefined {
    const parts: string[] = [];
    if (role && ROLE_LABELS[role]) parts.push(ROLE_LABELS[role]);
    if (dept) parts.push(dept);
    return parts.length > 0 ? parts.join(" - ") : undefined;
  }

  const status = car.status;
  const isTerminal = isTerminalStatus(status);
  const nextStatus = getNextStatus(status);
  const canAdvance = !isTerminal && nextStatus && nextStatus !== "CLOSED" && (isAssignee || isAdmin);
  const canRequestClose = status === "PENDING_CLOSURE" && (canClose || isAdmin);
  const canRejectClosure = status === "PENDING_CLOSURE" && (canClose || isAdmin);
  const canCancel = !isTerminal && (isRequester || isAdmin);
  const canDelete = isAdmin;

  const isOverdue =
    car.targetCompletionDate < new Date() &&
    status !== "CLOSED" &&
    status !== "CANCELLED";

  // Overdue days calculation
  const overdueDays = isOverdue
    ? Math.floor(
        (new Date().getTime() - new Date(car.targetCompletionDate).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  // Determine which sections to show based on workflow stage
  const statusIndex = [
    "OPEN",
    "ROOT_CAUSE_ANALYSIS",
    "IMMEDIATE_ACTION",
    "PLANNED_ACTION",
    "ACTION_RESULTS",
    "PENDING_CLOSURE",
    "CLOSED",
  ].indexOf(status);

  const showRootCause = statusIndex >= 1 || status === "CANCELLED";
  const showImmediateAction = statusIndex >= 2 || status === "CANCELLED";
  const showCorrectiveActions = statusIndex >= 3 || status === "CANCELLED";
  const showClosure = status === "PENDING_CLOSURE" || status === "CLOSED";
  const canEdit = (isAssignee || isAdmin) && !isTerminal;

  // --- Action handlers ---

  const handleAdvance = async () => {
    setLoadingAction("advance");
    setAdvanceDialogOpen(false);
    try {
      const result = await advanceCarStatus(car.id);
      if (result.success) {
        toast.success(t("car.workflow.advanceSuccess"));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(t("car.workflow.prerequisiteError"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClose = async () => {
    if (!closingNote.trim()) return;
    setLoadingAction("close");
    try {
      const result = await closeCar(car.id, closingNote);
      if (result.success) {
        toast.success(t("car.workflow.closeSuccess"));
        setCloseDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(t("car.workflow.prerequisiteError"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionComment.trim()) return;
    setLoadingAction("reject");
    try {
      const result = await rejectCarClosure(car.id, rejectionComment);
      if (result.success) {
        toast.success(t("car.workflow.rejectSuccess"));
        setRejectDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(t("car.workflow.prerequisiteError"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancel = async () => {
    setLoadingAction("cancel");
    try {
      const result = await cancelCar(car.id, cancelReason || undefined);
      if (result.success) {
        toast.success(t("car.workflow.cancelSuccess"));
        setCancelDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(t("car.workflow.prerequisiteError"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async () => {
    setLoadingAction("delete");
    setDeleteDialogOpen(false);
    try {
      const result = await deleteCar(car.id);
      if (result.success) {
        toast.success(t("common.status.success"));
        router.push("/car/list");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(t("common.status.error"));
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="default" onClick={() => router.back()} aria-label={t("common.actions.back")}>
              <ArrowLeft className="size-4" />
            </Button>
            <h2 className="text-xl font-semibold">{car.carCode}</h2>
            <CarStatusBadge status={status} />
            {isOverdue && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" />
                {t("car.daysOverdue", { days: overdueDays })}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground ml-10 text-sm">
            {format(new Date(car.createdAt), "dd.MM.yyyy HH:mm")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {canAdvance && (
            <Button
              size="sm"
              onClick={() => setAdvanceDialogOpen(true)}
              disabled={loadingAction !== null}
              className="gap-1 whitespace-nowrap"
            >
              {loadingAction === "advance" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {t("car.workflow.advance")}
            </Button>
          )}
          {canRequestClose && (
            <Button
              size="sm"
              onClick={() => setCloseDialogOpen(true)}
              disabled={loadingAction !== null}
              className="gap-1 whitespace-nowrap bg-green-600 hover:bg-green-700"
            >
              {loadingAction === "close" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {t("car.workflow.close")}
            </Button>
          )}
          {canRejectClosure && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setRejectDialogOpen(true)}
              disabled={loadingAction !== null}
              className="gap-1 whitespace-nowrap"
            >
              {loadingAction === "reject" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              {t("car.workflow.reject")}
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCancelDialogOpen(true)}
              disabled={loadingAction !== null}
              className="gap-1 whitespace-nowrap"
            >
              {loadingAction === "cancel" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Ban className="size-4" />
              )}
              {t("car.workflow.cancel")}
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={loadingAction !== null}
              className="gap-1 whitespace-nowrap"
            >
              {loadingAction === "delete" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t("car.delete")}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            asChild
            className="gap-1 whitespace-nowrap"
          >
            <Link href={`/car/${car.id}/print`} target="_blank">
              <Printer className="size-4" />
              {t("car.printAction")}
            </Link>
          </Button>
        </div>
      </div>

      {/* ========== WORKFLOW STEPPER ========== */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <CarWorkflowStepper currentStatus={status} />
        </CardContent>
      </Card>

      {/* ========== STAGE GUIDE ========== */}
      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
        <Info className="size-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            {t("car.stageGuide.title")}
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {t(`car.stageGuide.${status}` as Parameters<typeof t>[0])}
          </p>
        </div>
      </div>

      {/* ========== REQUEST INFORMATION ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-5" />
            {t("car.requestInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField
              icon={<FileText className="size-4" />}
              label={t("car.source")}
              value={car.source?.name ?? "-"}
            />
            {car.system && (
              <InfoField
                icon={<Target className="size-4" />}
                label={t("car.system")}
                value={car.system.name}
              />
            )}
            {car.process && (
              <InfoField
                icon={<Activity className="size-4" />}
                label={t("car.process")}
                value={car.process.name}
              />
            )}
            {car.customer && (
              <InfoField
                icon={<User className="size-4" />}
                label={t("car.customer")}
                value={car.customer.name}
              />
            )}
            {car.product && (
              <InfoField
                icon={<FileText className="size-4" />}
                label={t("car.product")}
                value={car.product.name}
              />
            )}
            {car.operation && (
              <InfoField
                icon={<Wrench className="size-4" />}
                label={t("car.operation")}
                value={car.operation.name}
              />
            )}
            {car.relatedStandard && (
              <InfoField
                icon={<FileText className="size-4" />}
                label={t("car.relatedStandard")}
                value={car.relatedStandard}
              />
            )}
          </div>

          <Separator />

          {/* People and departments */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField
              icon={<User className="size-4" />}
              label={t("car.createdBy")}
              value={car.requester?.name ?? "-"}
              subtitle={userSubtitle(car.requester?.role, car.requesterDepartment?.name)}
            />
            <InfoField
              icon={<User className="size-4" />}
              label={t("car.assignedTo")}
              value={car.assignee?.name ?? "-"}
              subtitle={userSubtitle(car.assignee?.role, car.responsibleDepartment?.name)}
            />
            <InfoField
              icon={<Building2 className="size-4" />}
              label={t("car.requesterDepartment")}
              value={car.requesterDepartment?.name ?? "-"}
            />
            <InfoField
              icon={<Building2 className="size-4" />}
              label={t("car.responsibleDepartment")}
              value={car.responsibleDepartment?.name ?? "-"}
            />
            <InfoField
              icon={<Calendar className="size-4" />}
              label={t("car.targetDate")}
              value={format(new Date(car.targetCompletionDate), "dd.MM.yyyy")}
              valueClassName={isOverdue ? "text-red-600 font-medium" : ""}
            />
            <InfoField
              icon={<Calendar className="size-4" />}
              label={t("car.closingDate")}
              value={
                car.closingDate
                  ? format(new Date(car.closingDate), "dd.MM.yyyy")
                  : "-"
              }
            />
          </div>

          <Separator />

          {/* Nonconformity Description */}
          <div>
            <p className="text-muted-foreground text-xs mb-1">
              {t("car.nonconformityDescription")}
            </p>
            <p className="text-sm whitespace-pre-wrap">{car.nonconformityDescription}</p>
          </div>

          {/* Notification users */}
          {car.notificationUsers && car.notificationUsers.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground text-xs mb-2">
                  {t("car.notificationUsers")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {car.notificationUsers.map((nu) => {
                    const fullUser = users.find((u) => u.id === nu.user?.id);
                    return (
                      <Badge key={nu.user?.id ?? nu.id} variant="outline" className="gap-1">
                        <Users className="size-3" />
                        <span>{nu.user?.name ?? "-"}</span>
                        {fullUser?.departmentName && (
                          <span className="text-muted-foreground font-normal">
                            ({fullUser.departmentName})
                          </span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Attachments */}
          {car.attachments && car.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground text-xs mb-2">
                  {t("car.attachments")}
                </p>
                <div className="space-y-2">
                  {car.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 rounded border px-3 py-2"
                    >
                      <FileText className="text-muted-foreground size-4 shrink-0" />
                      <span className="text-sm truncate flex-1 min-w-0">
                        {att.fileName}
                      </span>
                      {att.fileSize && (
                        <span className="text-muted-foreground text-xs shrink-0">
                          ({(att.fileSize / 1024).toFixed(1)} KB)
                        </span>
                      )}
                      <a
                        href={`/api/files/${att.filePath}`}
                        download={att.fileName}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted transition-colors shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="size-3" />
                        {t("common.actions.download")}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ========== ROOT CAUSE ANALYSIS ========== */}
      {showRootCause && (
        <CarRootCauseSection
          carId={car.id}
          carStatus={status}
          initialEntries={car.rootCauseAnalyses ?? []}
          canEdit={canEdit}
        />
      )}

      {/* ========== IMMEDIATE ACTION ========== */}
      {showImmediateAction && (
        <CarImmediateActionSection
          carId={car.id}
          carStatus={status}
          initialEntries={car.immediateActions ?? []}
          canEdit={canEdit}
        />
      )}

      {/* ========== CORRECTIVE ACTIONS ========== */}
      {showCorrectiveActions && (
        <CarCorrectiveActionsTable
          carId={car.id}
          carStatus={status}
          actions={car.correctiveActions ?? []}
          users={users}
          canEdit={canEdit}
        />
      )}

      {/* ========== CLOSURE INFO ========== */}
      {showClosure && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="size-5" />
              {t("car.closureInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              {car.closingDate && (
                <InfoField
                  icon={<Calendar className="size-4" />}
                  label={t("car.closingDate")}
                  value={format(new Date(car.closingDate), "dd.MM.yyyy HH:mm")}
                />
              )}
              {car.closedBy && (
                <InfoField
                  icon={<User className="size-4" />}
                  label={t("car.closedBy")}
                  value={car.closedBy.name}
                  subtitle={userSubtitle(car.closedBy.role)}
                />
              )}
            </div>
            {car.closingApprovalNote && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">
                  {t("car.closingNote")}
                </p>
                <p className="text-sm whitespace-pre-wrap rounded border p-3 bg-muted/50">
                  {car.closingApprovalNote}
                </p>
              </div>
            )}
            {/* Total cost - sum of corrective action costs */}
            {car.correctiveActions && car.correctiveActions.length > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">
                  {t("car.totalCost")}:
                </span>
                <span className="text-sm font-medium">
                  {car.correctiveActions.reduce(
                    (sum, ca) => sum + (Number(ca.cost) || 0),
                    0,
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========== ACTIVITY TIMELINE ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-5" />
            {t("car.activityTimeline")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CarActivityTimeline
            activities={
              (car.activityLogs ?? []).map((log) => ({
                id: log.id,
                action: log.action,
                details: (log.details as Record<string, unknown>) ?? null,
                createdAt: log.createdAt,
                user: log.user ?? null,
              }))
            }
          />
        </CardContent>
      </Card>

      {/* ========== DIALOGS ========== */}

      {/* Close CAR Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("car.workflow.close")}</DialogTitle>
            <DialogDescription>
              {t("car.workflow.confirmClose")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="closing-note">{t("car.workflow.closingNote")}</Label>
            <Textarea
              id="closing-note"
              placeholder={t("car.workflow.closingNotePlaceholder")}
              value={closingNote}
              onChange={(e) => setClosingNote(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseDialogOpen(false)}
              disabled={loadingAction !== null}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              onClick={handleClose}
              disabled={loadingAction !== null || !closingNote.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {loadingAction === "close" ? (
                <><Loader2 className="size-4 animate-spin mr-1" />{t("car.workflow.closing")}</>
              ) : t("car.workflow.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Closure Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("car.workflow.reject")}</DialogTitle>
            <DialogDescription>
              {t("car.workflow.confirmReject")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-comment">{t("car.workflow.rejectionComment")}</Label>
            <Textarea
              id="rejection-comment"
              placeholder={t("car.workflow.rejectionCommentPlaceholder")}
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={loadingAction !== null}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loadingAction !== null || !rejectionComment.trim()}
            >
              {loadingAction === "reject" ? (
                <><Loader2 className="size-4 animate-spin mr-1" />{t("car.workflow.rejecting")}</>
              ) : t("car.workflow.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel CAR Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("car.workflow.cancel")}</DialogTitle>
            <DialogDescription>
              {t("car.workflow.confirmCancel")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">{t("car.workflow.cancelReason")}</Label>
            <Textarea
              id="cancel-reason"
              placeholder={t("car.workflow.cancelReasonPlaceholder")}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={loadingAction !== null}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loadingAction !== null}
            >
              {loadingAction === "cancel" ? (
                <><Loader2 className="size-4 animate-spin mr-1" />{t("car.workflow.cancelling")}</>
              ) : t("car.workflow.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Status AlertDialog */}
      <AlertDialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("car.workflow.advance")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("car.workflow.confirmAdvance")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdvance}>
              {t("car.workflow.advance")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete CAR AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("car.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.confirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("car.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Sub-components ---

function InfoField({
  icon,
  label,
  value,
  subtitle,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={`text-sm font-medium truncate ${valueClassName ?? ""}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-muted-foreground text-xs truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

