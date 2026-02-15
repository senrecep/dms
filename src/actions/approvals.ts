"use server";

import { db } from "@/lib/db";
import { approvals, documents, activityLogs, users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { enqueueEmail, enqueueNotification } from "@/lib/queue";
import { publish, CHANNELS } from "@/lib/redis/pubsub";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";

export async function getPendingApprovals() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const items = await db.query.approvals.findMany({
    where: and(
      eq(approvals.approverId, session.user.id),
      eq(approvals.status, "PENDING"),
    ),
    with: {
      document: {
        columns: {
          id: true,
          title: true,
          documentCode: true,
          documentType: true,
          uploadedById: true,
          createdAt: true,
        },
        with: {
          uploadedBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: (approvals, { desc }) => [desc(approvals.createdAt)],
  });

  return items;
}

export async function getCompletedApprovals() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const items = await db.query.approvals.findMany({
    where: and(
      eq(approvals.approverId, session.user.id),
      inArray(approvals.status, ["APPROVED", "REJECTED"]),
    ),
    with: {
      document: {
        columns: {
          id: true,
          title: true,
          documentCode: true,
          documentType: true,
          uploadedById: true,
          createdAt: true,
        },
        with: {
          uploadedBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: (approvals, { desc }) => [desc(approvals.respondedAt)],
  });

  return items;
}

export async function approveDocument(approvalId: string, comment?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const approval = await db.query.approvals.findFirst({
    where: and(
      eq(approvals.id, approvalId),
      eq(approvals.approverId, session.user.id),
      eq(approvals.status, "PENDING"),
    ),
    with: {
      document: {
        with: {
          uploadedBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!approval) throw new Error("Approval not found or already processed");

  // --- DB operations ---
  await db
    .update(approvals)
    .set({
      status: "APPROVED",
      comment: comment ?? null,
      respondedAt: new Date(),
    })
    .where(eq(approvals.id, approvalId));

  let finalApprover: { name: string; email: string } | null = null;

  if (approval.approvalType === "INTERMEDIATE") {
    await db
      .update(documents)
      .set({ status: "INTERMEDIATE_APPROVAL" })
      .where(eq(documents.id, approval.documentId));

    if (approval.document.approverId) {
      await db.insert(approvals).values({
        documentId: approval.documentId,
        approverId: approval.document.approverId,
        approvalType: "FINAL",
        status: "PENDING",
      });

      finalApprover = await db.query.users.findFirst({
        where: eq(users.id, approval.document.approverId),
        columns: { name: true, email: true },
      }) ?? null;
    }
  } else {
    await db
      .update(documents)
      .set({ status: "APPROVED" })
      .where(eq(documents.id, approval.documentId));
  }

  await db.insert(activityLogs).values({
    documentId: approval.documentId,
    userId: session.user.id,
    action: "APPROVED",
    details: { comment, approvalType: approval.approvalType },
  });

  // --- Real-time & cache ---
  await publish(CHANNELS.approvals, {
    targetUserId: approval.document.uploadedById,
    data: {
      documentId: approval.documentId,
      status: "APPROVED",
      approvalType: approval.approvalType,
    },
  });

  revalidatePath("/approvals");
  revalidatePath("/documents");

  // --- Async notifications (non-critical, don't block response) ---
  try {
    const jobs: Promise<unknown>[] = [];

    jobs.push(enqueueNotification({
      userId: approval.document.uploadedById,
      type: "APPROVAL_REQUEST",
      titleKey: "documentApproved",
      messageParams: { docTitle: approval.document.title, docCode: approval.document.documentCode, approvalType: approval.approvalType === "INTERMEDIATE" ? "intermediately" : "finally" },
      relatedDocumentId: approval.documentId,
    }));

    if (approval.approvalType === "FINAL") {
      jobs.push(enqueueEmail({
        to: approval.document.uploadedBy.email,
        subjectKey: "documentApproved",
        subjectParams: { title: approval.document.title },
        templateName: "document-approved",
        templateProps: {
          uploaderName: approval.document.uploadedBy.name,
          documentTitle: approval.document.title,
          documentCode: approval.document.documentCode,
          approvedBy: session.user.name,
          publishUrl: `${env.NEXT_PUBLIC_APP_URL}/documents/${approval.documentId}`,
        },
      }));
    }

    if (approval.approvalType === "INTERMEDIATE" && approval.document.approverId) {
      jobs.push(enqueueNotification({
        userId: approval.document.approverId,
        type: "APPROVAL_REQUEST",
        titleKey: "newFinalApprovalRequest",
        messageParams: { docTitle: approval.document.title, docCode: approval.document.documentCode },
        relatedDocumentId: approval.documentId,
      }));

      if (finalApprover) {
        jobs.push(enqueueEmail({
          to: finalApprover.email,
          subjectKey: "approvalRequest",
          subjectParams: { title: approval.document.title },
          templateName: "approval-request",
          templateProps: {
            approverName: finalApprover.name,
            documentTitle: approval.document.title,
            documentCode: approval.document.documentCode,
            uploaderName: approval.document.uploadedBy.name,
            approvalUrl: `${env.NEXT_PUBLIC_APP_URL}/documents/${approval.documentId}`,
          },
        }));
      }
    }

    await Promise.allSettled(jobs);
  } catch (error) {
    console.error("[approveDocument] Failed to enqueue notifications:", error);
  }
}

const rejectSchema = z.object({
  comment: z.string().min(10, "Rejection reason must be at least 10 characters"),
});

export async function rejectDocument(approvalId: string, comment: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const parsed = rejectSchema.safeParse({ comment });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const approval = await db.query.approvals.findFirst({
    where: and(
      eq(approvals.id, approvalId),
      eq(approvals.approverId, session.user.id),
      eq(approvals.status, "PENDING"),
    ),
    with: {
      document: {
        with: {
          uploadedBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!approval) throw new Error("Approval not found or already processed");

  await db
    .update(approvals)
    .set({
      status: "REJECTED",
      comment: parsed.data.comment,
      respondedAt: new Date(),
    })
    .where(eq(approvals.id, approvalId));

  await db
    .update(documents)
    .set({ status: "DRAFT" })
    .where(eq(documents.id, approval.documentId));

  await db.insert(activityLogs).values({
    documentId: approval.documentId,
    userId: session.user.id,
    action: "REJECTED",
    details: { comment: parsed.data.comment },
  });

  await publish(CHANNELS.approvals, {
    targetUserId: approval.document.uploadedById,
    data: {
      documentId: approval.documentId,
      status: "REJECTED",
      comment: parsed.data.comment,
    },
  });

  revalidatePath("/approvals");
  revalidatePath("/documents");

  // Async notifications (non-critical)
  try {
    await Promise.allSettled([
      enqueueNotification({
        userId: approval.document.uploadedById,
        type: "DOCUMENT_REJECTED",
        titleKey: "documentRejected",
        messageParams: { docTitle: approval.document.title, docCode: approval.document.documentCode, reason: parsed.data.comment },
        relatedDocumentId: approval.documentId,
      }),
      enqueueEmail({
        to: approval.document.uploadedBy.email,
        subjectKey: "documentRejected",
        subjectParams: { title: approval.document.title },
        templateName: "document-rejected",
        templateProps: {
          uploaderName: approval.document.uploadedBy.name,
          documentTitle: approval.document.title,
          documentCode: approval.document.documentCode,
          rejectedBy: session.user.name,
          rejectionReason: parsed.data.comment,
          editUrl: `${env.NEXT_PUBLIC_APP_URL}/documents/${approval.documentId}`,
        },
      }),
    ]);
  } catch (error) {
    console.error("[rejectDocument] Failed to enqueue notifications:", error);
  }
}
