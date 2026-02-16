"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendPasswordReset } from "@/actions/users";
import { toast } from "sonner";

const ERROR_CODE_MAP: Record<string, string> = {
  USER_NOT_FOUND: "userNotFound",
  PASSWORD_RESET_FAILED: "passwordResetFailed",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  UNEXPECTED_ERROR: "unexpectedError",
};

export function ResetPasswordButton({ userId }: { userId: string }) {
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("settings.users");
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await sendPasswordReset(userId);
      if (!result.success) {
        const key = ERROR_CODE_MAP[result.errorCode] ?? "unexpectedError";
        toast.error(tErrors(key));
      } else {
        toast.success(tCommon("passwordResetSent"));
      }
    } catch {
      toast.error(tErrors("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={loading}
      title={tCommon("sendResetLink")}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Mail className="size-4" />
      )}
    </Button>
  );
}
