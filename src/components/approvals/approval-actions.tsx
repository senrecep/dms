"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveDocument } from "@/actions/approvals";
import { RejectionDialog } from "@/components/approvals/rejection-dialog";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ApprovalRow } from "@/components/approvals/approval-columns";

interface ApprovalActionsProps {
  approval: ApprovalRow;
}

export function ApprovalActions({ approval }: ApprovalActionsProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  function handleApprove() {
    startTransition(async () => {
      await approveDocument(approval.id);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button asChild size="sm" variant="outline" className="size-8 p-0">
        <Link href={`/documents/${approval.documentId}`} title={t("common.actions.viewDetails")}>
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
        documentTitle={approval.document.title}
      />
    </div>
  );
}
