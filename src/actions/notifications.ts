"use server";

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, and, count } from "drizzle-orm";
import { sendToUser } from "@/lib/sse";
import { revalidatePath } from "next/cache";

export async function getNotifications(page = 1, limit = 20) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

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
            title: true,
            documentCode: true,
          },
        },
      },
    }),
    db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.userId, session.user.id)),
  ]);

  return {
    notifications: items,
    total: totalResult[0]?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit),
  };
}

export async function markNotificationAsRead(notificationId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, session.user.id),
      ),
    );

  revalidatePath("/approvals");
  revalidatePath("/read-tasks");
  revalidatePath("/notifications");
}

export async function markAllNotificationsAsRead() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.userId, session.user.id),
        eq(notifications.isRead, false),
      ),
    );

  revalidatePath("/approvals");
  revalidatePath("/read-tasks");
  revalidatePath("/notifications");
}

export async function createNotification(data: {
  userId: string;
  type: (typeof notifications.$inferInsert)["type"];
  titleKey: string;
  messageParams?: Record<string, string | number>;
  relatedDocumentId?: string;
}) {
  const params = data.messageParams ?? {};
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: data.userId,
      type: data.type,
      title: data.titleKey,
      message: JSON.stringify(params),
      relatedDocumentId: data.relatedDocumentId,
    })
    .returning();

  await sendToUser(data.userId, {
    event: "NOTIFICATION",
    data: {
      id: notification.id,
      type: data.type,
      title: data.titleKey,
      message: JSON.stringify(params),
      relatedDocumentId: data.relatedDocumentId,
    },
  });

  return notification;
}
