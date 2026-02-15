"use client";

import { useFilterStore } from "@/stores/filter-store";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

type Department = { id: string; name: string };

type DocumentFiltersProps = {
  departments: Department[];
};

export function DocumentFilters({ departments }: DocumentFiltersProps) {
  const t = useTranslations();
  const {
    searchQuery,
    departmentFilter,
    documentTypeFilter,
    statusFilter,
    setSearch,
    setDepartmentFilter,
    setDocumentTypeFilter,
    setStatusFilter,
    resetFilters,
  } = useFilterStore();

  const hasActiveFilters = searchQuery || departmentFilter || documentTypeFilter || statusFilter;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-64">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder={t("documents.list.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={departmentFilter ?? ""}
        onValueChange={(val) => setDepartmentFilter(val || null)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t("documents.form.selectDepartment")} />
        </SelectTrigger>
        <SelectContent>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={documentTypeFilter ?? ""}
        onValueChange={(val) => setDocumentTypeFilter(val || null)}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder={t("documents.form.selectType")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PROCEDURE">{t("documents.type.procedure")}</SelectItem>
          <SelectItem value="INSTRUCTION">{t("documents.type.instruction")}</SelectItem>
          <SelectItem value="FORM">{t("documents.type.form")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={statusFilter ?? ""}
        onValueChange={(val) => setStatusFilter(val || null)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t("common.labels.status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="DRAFT">{t("documents.status.draft")}</SelectItem>
          <SelectItem value="PENDING_APPROVAL">{t("documents.status.pendingApproval")}</SelectItem>
          <SelectItem value="PREPARER_APPROVED">{t("documents.status.preparerApproved")}</SelectItem>
          <SelectItem value="APPROVED">{t("documents.status.approved")}</SelectItem>
          <SelectItem value="PUBLISHED">{t("documents.status.published")}</SelectItem>
          <SelectItem value="PREPARER_REJECTED">{t("documents.status.preparerRejected")}</SelectItem>
          <SelectItem value="APPROVER_REJECTED">{t("documents.status.approverRejected")}</SelectItem>
          <SelectItem value="CANCELLED">{t("documents.status.cancelled")}</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 gap-1">
          <X className="size-4" />
          {t("common.actions.cancel")}
        </Button>
      )}
    </div>
  );
}
