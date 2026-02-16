import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserDetail } from "@/actions/users";
import { UserDetailView } from "@/components/users/user-detail-view";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN") redirect("/");

  const { id } = await params;
  const user = await getUserDetail(id);

  if (!user) notFound();

  const t = await getTranslations("settings.users.detail");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <UserDetailView user={user} />
    </div>
  );
}
