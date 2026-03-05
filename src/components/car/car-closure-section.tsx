"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, CalendarCheck } from "lucide-react";
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
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { closeCar, rejectCarClosure } from "@/actions/car-workflow";

type ClosureInfo = {
  closingDate: Date | null;
  closedByName: string | null;
  closingApprovalNote: string | null;
};

type CarClosureSectionProps = {
  carId: string;
  carStatus: string;
  closureInfo: ClosureInfo;
  canClose: boolean;
};

const CLOSURE_VISIBLE_STATUSES = ["PENDING_CLOSURE", "CLOSED"];

export function CarClosureSection({
  carId,
  carStatus,
  closureInfo,
  canClose,
}: CarClosureSectionProps) {
  const t = useTranslations("car");
  const [isPending, startTransition] = useTransition();
  const [closingNote, setClosingNote] = useState("");
  const [rejectionComment, setRejectionComment] = useState("");
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  if (!CLOSURE_VISIBLE_STATUSES.includes(carStatus)) {
    return null;
  }

  function handleClose() {
    if (!closingNote.trim()) {
      toast.error(t("closingNoteRequired"));
      return;
    }
    startTransition(async () => {
      const result = await closeCar(carId, closingNote);
      if (result.success) {
        toast.success(t("workflow.closeSuccess"));
        setCloseDialogOpen(false);
        setClosingNote("");
      } else {
        toast.error(result.error);
        setCloseDialogOpen(false);
      }
    });
  }

  function handleReject() {
    if (!rejectionComment.trim()) {
      toast.error(t("rejectionCommentRequired"));
      return;
    }
    startTransition(async () => {
      const result = await rejectCarClosure(carId, rejectionComment);
      if (result.success) {
        toast.success(t("workflow.rejectSuccess"));
        setRejectDialogOpen(false);
        setRejectionComment("");
      } else {
        toast.error(result.error);
        setRejectDialogOpen(false);
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {carStatus === "CLOSED" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <CalendarCheck className="h-4 w-4 text-purple-600" />
            )}
            {carStatus === "CLOSED" ? t("closedTitle") : t("pendingClosureTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {carStatus === "CLOSED" && closureInfo.closingDate ? (
            /* Closed - show info */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-0">
                  {t("status.CLOSED")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(closureInfo.closingDate), "PPP", {
                    locale: tr,
                  })}
                </span>
              </div>
              {closureInfo.closedByName && (
                <p className="text-sm text-muted-foreground">
                  {closureInfo.closedByName}
                </p>
              )}
              {closureInfo.closingApprovalNote && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("closingNote")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {closureInfo.closingApprovalNote}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* PENDING_CLOSURE - show approve / reject buttons */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("pendingClosureDescription")}
              </p>

              {canClose && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setCloseDialogOpen(true)}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    {t("confirmClose")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={isPending}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    {t("confirmReject")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close confirmation dialog */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmClose")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workflow.confirmClose")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2 space-y-1.5">
            <Label htmlFor="closing-note">{t("closingNote")}</Label>
            <Textarea
              id="closing-note"
              value={closingNote}
              onChange={(e) => setClosingNote(e.target.value)}
              placeholder={t("workflow.closingNotePlaceholder")}
              rows={4}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClose}
              disabled={isPending || !closingNote.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? t("workflow.closing") : t("confirmClose")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject confirmation dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmReject")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workflow.confirmReject")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2 space-y-1.5">
            <Label htmlFor="rejection-comment">{t("rejectionComment")}</Label>
            <Textarea
              id="rejection-comment"
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder={t("workflow.rejectionCommentPlaceholder")}
              rows={4}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isPending || !rejectionComment.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending ? t("workflow.rejecting") : t("confirmReject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
