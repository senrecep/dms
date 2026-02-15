import type { Job } from "bullmq";
import type { CreateBulkNotificationsPayload } from "../types";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { sendToUser } from "@/lib/sse";

export async function processCreateBulkNotifications(
  job: Job<CreateBulkNotificationsPayload>,
) {
  const { notifications: items } = job.data;

  if (items.length === 0) return;

  // Bulk insert all notifications
  const inserted = await db
    .insert(notifications)
    .values(
      items.map((item) => ({
        userId: item.userId,
        type: item.type,
        title: item.titleKey,
        message: JSON.stringify(item.messageParams ?? {}),
        relatedDocumentId: item.relatedDocumentId,
        relatedRevisionId: item.relatedRevisionId,
      })),
    )
    .returning();

  // Send SSE to each user
  for (const notification of inserted) {
    await sendToUser(notification.userId, {
      event: "NOTIFICATION",
      data: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedDocumentId: notification.relatedDocumentId,
        relatedRevisionId: notification.relatedRevisionId,
      },
    });
  }

  console.log(
    `[Worker:create-bulk-notifications] Created ${inserted.length} notifications`,
  );
}
