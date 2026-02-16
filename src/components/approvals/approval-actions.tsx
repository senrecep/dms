"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveDocument } from "@/actions/approvals";
import { RejectionDialog } from "@/components/approvals/rejection-dialog";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { ApprovalRow } from "@/components/approvals/approval-columns";

const ERROR_CODE_MAP: Record<string, string> = {
  APPROVAL_NOT_FOUND: "approvalNotFound",
  REJECTION_TOO_SHORT: "rejectionTooShort",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  UNEXPECTED_ERROR: "unexpectedError",
};

interface ApprovalActionsProps {
  approval: ApprovalRow;
}

export function ApprovalActions({ approval }: ApprovalActionsProps) {
  const t = useTranslations();
  const tErrors = useTranslations("errors");
  const [isPending, startTransition] = useTransition();
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  function handleApprove() {
    startTransition(async () => {
      const result = await approveDocument(approval.id);
      if (!result.success) {
        const key = ERROR_CODE_MAP[result.errorCode] ?? "unexpectedError";
        toast.error(tErrors(key));
        return;
      }
      toast.success(t("approvals.actions.approved"));
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button asChild size="sm" variant="outline" className="size-9 p-0">
        <Link href={`/documents/${approval.revision.documentId}`} title={t("common.actions.viewDetails")}>
          <ExternalLink className="size-3.5" />
        </Link>
      </Button>
      <Button
        size="sm"
        variant="default"
        onClick={handleApprove}
        disabled={isPending}
        className="bg-green-600 hover:bg-green-700"
      >
        {t("approvals.actions.approve")}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setShowRejectDialog(true)}
        disabled={isPending}
      >
        {t("approvals.actions.reject")}
      </Button>
      <RejectionDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        approvalId={approval.id}
        documentTitle={approval.revision.title}
      />
    </div>
  );
}
