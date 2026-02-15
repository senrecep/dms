"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmRead } from "@/actions/read-confirmations";
import { useTranslations } from "next-intl";

interface ReadConfirmButtonProps {
  documentId: string;
}

export function ReadConfirmButton({ documentId }: ReadConfirmButtonProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      await confirmRead(documentId);
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
