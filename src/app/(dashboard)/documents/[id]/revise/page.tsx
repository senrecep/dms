import { getDocumentById, getDepartments, getApprovers, getAllActiveUsers } from "@/actions/documents";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { RevisionForm } from "@/components/documents/revision-form";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ReviseDocumentPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  let document;
  try {
    document = await getDocumentById(id);
  } catch {
    notFound();
  }

  const [departments, approvers, allUsers] = await Promise.all([
    getDepartments(),
    getApprovers(),
    getAllActiveUsers(),
  ]);

  const currentRevision = document.revisions[0];
  if (!currentRevision) {
    notFound();
  }

  const currentRevisionData = {
    id: currentRevision.id,
    revisionNo: currentRevision.revisionNo,
    title: currentRevision.title,
    description: currentRevision.description,
    documentType: currentRevision.documentType,
    status: currentRevision.status,
    departmentId: currentRevision.departmentId,
    preparerDepartmentId: currentRevision.preparerDepartmentId,
    preparerId: currentRevision.preparerId,
    approverId: currentRevision.approverId,
    fileName: currentRevision.fileName,
    distributionDepartmentIds: currentRevision.distributionLists.map((dl) => dl.departmentId),
    distributionUserIds: currentRevision.distributionUsers.map((du) => du.userId),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("documents.detail.newRevision")}: {document.documentCode}
      </h1>
      <RevisionForm
        documentId={document.id}
        currentRevision={currentRevisionData}
        departments={departments}
        approvers={approvers}
        allUsers={allUsers}
        currentUserId={session.user.id}
      />
    </div>
  );
}
