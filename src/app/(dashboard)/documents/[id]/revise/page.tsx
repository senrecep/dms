import { getDocumentById } from "@/actions/documents";
import { getTranslations } from "next-intl/server";
import { RevisionForm } from "@/components/documents/revision-form";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ReviseDocumentPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();

  let document;
  try {
    document = await getDocumentById(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Revise: {document.documentCode}
      </h1>
      <RevisionForm documentId={document.id} currentRevisionNo={document.currentRevisionNo} />
    </div>
  );
}
