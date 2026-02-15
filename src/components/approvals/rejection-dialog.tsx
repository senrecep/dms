"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { rejectDocument } from "@/actions/approvals";
import { useTranslations } from "next-intl";

const rejectionSchema = z.object({
  comment: z.string().min(10, "Rejection reason must be at least 10 characters"),
});

type RejectionFormValues = z.infer<typeof rejectionSchema>;

interface RejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvalId: string;
  documentTitle: string;
}

export function RejectionDialog({
  open,
  onOpenChange,
  approvalId,
  documentTitle,
}: RejectionDialogProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const form = useForm<RejectionFormValues>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: {
      comment: "",
    },
  });

  function onSubmit(values: RejectionFormValues) {
    startTransition(async () => {
      await rejectDocument(approvalId, values.comment);
      form.reset();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("approvals.actions.reject")}</DialogTitle>
          <DialogDescription>
            {documentTitle}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("approvals.form.rejectionReason")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("approvals.form.rejectionReasonPlaceholder")}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {t("approvals.actions.reject")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
