import type { Metadata } from "next";
import { getDocuments, getDepartments } from "@/actions/documents";
import { DocumentTable } from "@/components/documents/document-table";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Documents",
  description: "Browse, search, and manage all documents in the system.",
  robots: { index: false, follow: false },
};

export default async function DocumentsPage() {
  const t = await getTranslations();
  const [result, departments] = await Promise.all([
    getDocuments(),
    getDepartments(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("documents.list.title")}</h1>
      <DocumentTable
        initialData={result.data}
        initialTotal={result.total}
        departments={departments}
      />
    </div>
  );
}
