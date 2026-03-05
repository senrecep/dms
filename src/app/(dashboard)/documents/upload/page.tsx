import type { Metadata } from "next";
import { getDepartments, getApprovers, getAllActiveUsers } from "@/actions/documents";
import { UploadForm } from "@/components/documents/upload-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Upload Document",
  description: "Upload a new controlled document to the quality management system.",
  robots: { index: false, follow: false },
};
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function UploadDocumentPage() {
  const t = await getTranslations();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const [departments, approvers, allUsers] = await Promise.all([
    getDepartments(),
    getApprovers(),
    getAllActiveUsers(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("documents.upload.title")}</h1>
      <UploadForm
        departments={departments}
        approvers={approvers}
        allUsers={allUsers}
        currentUserId={session.user.id}
      />
    </div>
  );
}
