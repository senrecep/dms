"use server";

import { db } from "@/lib/db";
import {
  readConfirmations,
  activityLogs,
  documentRevisions,
  documents,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, isNull, isNotNull, count } from "drizzle-orm";
import { enqueueNotification } from "@/lib/queue";
import { publish, CHANNELS } from "@/lib/redis/pubsub";
import { revalidatePath } from "next/cache";

export async function getPendingReadTasks() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Only MANAGER role users can have read tasks
  if (session.user.role === "USER") {
    return [];
  }

  const items = await db.query.readConfirmations.findMany({
    where: and(
      eq(readConfirmations.userId, session.user.id),
      isNull(readConfirmations.confirmedAt),
    ),
    with: {
      revision: {
        columns: {
          id: true,
          title: true,
          documentType: true,
          publishedAt: true,
          createdById: true,
          documentId: true,
        },
        with: {
          document: {
            columns: {
              id: true,
              documentCode: true,
            },
          },
          createdBy: {
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

  // Only MANAGER role users can have read tasks
  if (session.user.role === "USER") {
    return [];
  }

  const items = await db.query.readConfirmations.findMany({
    where: and(
      eq(readConfirmations.userId, session.user.id),
      isNotNull(readConfirmations.confirmedAt),
    ),
    with: {
      revision: {
        columns: {
          id: true,
          title: true,
          documentType: true,
          publishedAt: true,
          createdById: true,
          documentId: true,
        },
        with: {
          document: {
            columns: {
              id: true,
              documentCode: true,
            },
          },
          createdBy: {
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

export async function confirmRead(revisionId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Only MANAGER role users can confirm read
  if (session.user.role === "USER") {
    throw new Error("Only managers can confirm document reading");
  }

  const confirmation = await db.query.readConfirmations.findFirst({
    where: and(
      eq(readConfirmations.revisionId, revisionId),
      eq(readConfirmations.userId, session.user.id),
      isNull(readConfirmations.confirmedAt),
    ),
    with: {
      revision: {
        columns: {
          id: true,
          title: true,
          createdById: true,
          documentId: true,
        },
        with: {
          document: {
            columns: {
              id: true,
              documentCode: true,
            },
          },
        },
      },
    },
  });

  if (!confirmation) throw new Error("Read task not found or already confirmed");

  const revision = confirmation.revision;
  const documentId = revision.documentId;

  await db
    .update(readConfirmations)
    .set({ confirmedAt: new Date() })
    .where(eq(readConfirmations.id, confirmation.id));

  await db.insert(activityLogs).values({
    documentId,
    revisionId,
    userId: session.user.id,
    action: "READ",
    details: { confirmedAt: new Date().toISOString() },
  });

  await publish(CHANNELS.notifications(revision.createdById), {
    event: "READ_CONFIRMATION",
    data: {
      documentId,
      revisionId,
      userId: session.user.id,
      userName: session.user.name,
    },
  });

  revalidatePath("/read-tasks");
  revalidatePath("/documents");

  // Async notification
  try {
    await enqueueNotification({
      userId: revision.createdById,
      type: "READ_ASSIGNMENT",
      titleKey: "documentReadConfirmed",
      messageParams: {
        userName: session.user.name,
        docTitle: revision.title,
        docCode: revision.document.documentCode,
      },
      relatedDocumentId: documentId,
      relatedRevisionId: revisionId,
    });
  } catch (error) {
    console.error("[confirmRead] Failed to enqueue notification:", error);
  }
}

export async function getReadStatus(revisionId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const [totalResult] = await db
    .select({ count: count() })
    .from(readConfirmations)
    .where(eq(readConfirmations.revisionId, revisionId));

  const [confirmedResult] = await db
    .select({ count: count() })
    .from(readConfirmations)
    .where(
      and(
        eq(readConfirmations.revisionId, revisionId),
        isNotNull(readConfirmations.confirmedAt),
      ),
    );

  return {
    total: totalResult?.count ?? 0,
    confirmed: confirmedResult?.count ?? 0,
  };
}
