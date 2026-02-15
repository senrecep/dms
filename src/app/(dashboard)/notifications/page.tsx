import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const t = await getTranslations("notifications");
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const [items, totalResult] = await Promise.all([
    db.query.notifications.findMany({
      where: and(eq(notifications.userId, session.user.id)),
      orderBy: [desc(notifications.createdAt)],
      limit,
      offset,
      with: {
        relatedDocument: {
          columns: {
            id: true,
            documentCode: true,
          },
        },
        relatedRevision: {
          columns: {
            id: true,
            title: true,
          },
        },
      },
    }),
    db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.userId, session.user.id)),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      <NotificationList
        notifications={items.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.relatedRevision?.title ?? n.title,
          message: n.message,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
          relatedDocumentId: n.relatedDocumentId,
          relatedDocument: n.relatedDocument
            ? { id: n.relatedDocument.id, documentCode: n.relatedDocument.documentCode, title: n.relatedRevision?.title ?? "" }
            : null,
        }))}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
