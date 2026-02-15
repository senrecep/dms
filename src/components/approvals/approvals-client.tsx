"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApprovalTable } from "@/components/approvals/approval-table";
import {
  usePendingColumns,
  useCompletedColumns,
  type ApprovalRow,
} from "@/components/approvals/approval-columns";
import { useTranslations } from "next-intl";

interface ApprovalsClientProps {
  pending: ApprovalRow[];
  completed: ApprovalRow[];
}

export function ApprovalsClient({ pending, completed }: ApprovalsClientProps) {
  const t = useTranslations("approvals");
  const pendingColumns = usePendingColumns();
  const completedColumns = useCompletedColumns();

  return (
    <Tabs defaultValue="pending" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pending">
          {t("list.pending")}
          {pending.length > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {pending.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="completed">{t("list.completed")}</TabsTrigger>
      </TabsList>
      <TabsContent value="pending">
        <ApprovalTable columns={pendingColumns} data={pending} />
      </TabsContent>
      <TabsContent value="completed">
        <ApprovalTable columns={completedColumns} data={completed} />
      </TabsContent>
    </Tabs>
  );
}
