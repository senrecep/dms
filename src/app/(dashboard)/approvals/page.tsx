import { getTranslations } from "next-intl/server";
import { getPendingApprovals, getCompletedApprovals } from "@/actions/approvals";
import { ApprovalsClient } from "@/components/approvals/approvals-client";

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
