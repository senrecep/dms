"use server";

import { db } from "@/lib/db";
import { readConfirmations, activityLogs } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, isNull, isNotNull, count } from "drizzle-orm";
import { enqueueNotification } from "@/lib/queue";
import { publish, CHANNELS } from "@/lib/redis/pubsub";
import { revalidatePath } from "next/cache";

export async function getPendingReadTasks() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const items = await db.query.readConfirmations.findMany({
    where: and(
      eq(readConfirmations.userId, session.user.id),
      isNull(readConfirmations.confirmedAt),
    ),
    with: {
      document: {
        columns: {
          id: true,
          title: true,
          documentCode: true,
          documentType: true,
          publishedAt: true,
          uploadedById: true,
        },
        with: {
          uploadedBy: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: (readConfirmations, { desc }) => [
      desc(readConfirmations.createdAt),
    ],
  });

  return items;
}

export async function getCompletedReadTasks() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const items = await db.query.readConfirmations.findMany({
    where: and(
      eq(readConfirmations.userId, session.user.id),
      isNotNull(readConfirmations.confirmedAt),
    ),
    with: {
      document: {
        columns: {
          id: true,
          title: true,
          documentCode: true,
          documentType: true,
          publishedAt: true,
          uploadedById: true,
        },
        with: {
          uploadedBy: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: (readConfirmations, { desc }) => [
      desc(readConfirmations.confirmedAt),
    ],
  });

  return items;
}

export async function confirmRead(documentId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const confirmation = await db.query.readConfirmations.findFirst({
    where: and(
      eq(readConfirmations.documentId, documentId),
      eq(readConfirmations.userId, session.user.id),
      isNull(readConfirmations.confirmedAt),
    ),
    with: {
      document: {
        columns: {
          id: true,
          title: true,
          documentCode: true,
          uploadedById: true,
        },
      },
    },
  });

  if (!confirmation) throw new Error("Read task not found or already confirmed");

  await db
    .update(readConfirmations)
    .set({ confirmedAt: new Date() })
    .where(eq(readConfirmations.id, confirmation.id));

  await db.insert(activityLogs).values({
    documentId,
    userId: session.user.id,
    action: "READ",
    details: { confirmedAt: new Date().toISOString() },
  });

  await publish(CHANNELS.notifications(confirmation.document.uploadedById), {
    event: "READ_CONFIRMATION",
    data: {
      documentId,
      userId: session.user.id,
      userName: session.user.name,
    },
  });

  revalidatePath("/read-tasks");
  revalidatePath("/documents");

  // Async notification (non-critical)
  try {
    await enqueueNotification({
      userId: confirmation.document.uploadedById,
      type: "READ_ASSIGNMENT",
      titleKey: "documentReadConfirmed",
      messageParams: { userName: session.user.name, docTitle: confirmation.document.title, docCode: confirmation.document.documentCode },
      relatedDocumentId: documentId,
    });
  } catch (error) {
    console.error("[confirmRead] Failed to enqueue notification:", error);
  }
}

export async function getReadStatus(documentId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const [totalResult] = await db
    .select({ count: count() })
    .from(readConfirmations)
    .where(eq(readConfirmations.documentId, documentId));

  const [confirmedResult] = await db
    .select({ count: count() })
    .from(readConfirmations)
    .where(
      and(
        eq(readConfirmations.documentId, documentId),
        isNotNull(readConfirmations.confirmedAt),
      ),
    );

  return {
    total: totalResult?.count ?? 0,
    confirmed: confirmedResult?.count ?? 0,
  };
}
