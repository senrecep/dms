import type { Job } from "bullmq";
import type { CreateNotificationPayload } from "../types";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { sendToUser } from "@/lib/sse";

export async function processCreateNotification(
  job: Job<CreateNotificationPayload>,
) {
  const { userId, type, titleKey, messageParams, relatedDocumentId } =
    job.data;

  const params = messageParams ?? {};
  const [notification] = await db
    .insert(notifications)
    .values({
      userId,
      type,
      title: titleKey,
      message: JSON.stringify(params),
      relatedDocumentId,
    })
    .returning();

  await sendToUser(userId, {
    event: "NOTIFICATION",
    data: {
      id: notification.id,
      type,
      title: titleKey,
      message: JSON.stringify(params),
      relatedDocumentId,
    },
  });

  console.log(
    `[Worker:create-notification] Created for user ${userId} (${type})`,
  );
  return notification;
}
