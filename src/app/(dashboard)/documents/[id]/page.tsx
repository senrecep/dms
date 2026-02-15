import { getDocumentById } from "@/actions/documents";
import { getTranslations } from "next-intl/server";
import { DocumentDetailView } from "@/components/documents/document-detail-view";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DocumentDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  let document;
  try {
    document = await getDocumentById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("documents.detail.title")}</h1>
      <DocumentDetailView document={document} />
    </div>
  );
}
