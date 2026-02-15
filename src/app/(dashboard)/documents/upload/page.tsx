import { getDepartments, getApprovers, getAllActiveUsers } from "@/actions/documents";
import { UploadForm } from "@/components/documents/upload-form";
import { getTranslations } from "next-intl/server";

export default async function UploadDocumentPage() {
  const t = await getTranslations();
  const [departments, approvers, allUsers] = await Promise.all([
    getDepartments(),
    getApprovers(),
    getAllActiveUsers(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("documents.upload.title")}</h1>
      <UploadForm departments={departments} approvers={approvers} allUsers={allUsers} />
    </div>
  );
}
