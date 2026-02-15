"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendPasswordReset } from "@/actions/users";
import { toast } from "sonner";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await sendPasswordReset(userId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Parola sifirlama linki gonderildi.");
      }
    } catch {
      toast.error("Bir hata olustu.");
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
      title="Parola sifirlama linki gonder"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Mail className="size-4" />
      )}
    </Button>
  );
}
