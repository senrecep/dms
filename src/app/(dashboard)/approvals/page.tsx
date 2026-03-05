import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPendingApprovals, getCompletedApprovals } from "@/actions/approvals";
import { ApprovalsClient } from "@/components/approvals/approvals-client";

export const metadata: Metadata = {
  title: "Approvals",
  description: "Review and manage pending document approval requests.",
  robots: { index: false, follow: false },
};

export default async function ApprovalsPage() {
  const t = await getTranslations("approvals");
  const [pending, completed] = await Promise.all([
    getPendingApprovals(),
    getCompletedApprovals(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("list.title")}</h1>
      </div>
      <ApprovalsClient pending={pending} completed={completed} />
    </div>
  );
}
