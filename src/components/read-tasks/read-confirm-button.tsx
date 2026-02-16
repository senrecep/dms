"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmRead } from "@/actions/read-confirmations";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface ReadConfirmButtonProps {
  revisionId: string;
}

const ERROR_CODE_MAP: Record<string, string> = {
  READ_TASK_NOT_FOUND: "readTaskNotFound",
  ONLY_MANAGERS_CAN_CONFIRM: "onlyManagersCanConfirm",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  UNEXPECTED_ERROR: "unexpectedError",
};

export function ReadConfirmButton({ revisionId }: ReadConfirmButtonProps) {
  const t = useTranslations();
  const tErrors = useTranslations("errors");
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmRead(revisionId);
      if (!result.success) {
        const key = ERROR_CODE_MAP[result.errorCode] ?? "unexpectedError";
        toast.error(tErrors(key));
        return;
      }
      setConfirmed(true);
    });
  }

  if (confirmed) {
    return (
      <Button size="sm" variant="outline" disabled className="bg-green-50 text-green-700 border-green-200">
        {t("common.actions.confirm")}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={handleConfirm}
      disabled={isPending}
    >
      {t("documents.actions.markAsRead")}
    </Button>
  );
}
