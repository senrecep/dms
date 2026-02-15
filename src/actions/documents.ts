"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  documents,
  distributionLists,
  distributionUsers,
  readConfirmations,
  activityLogs,
  documentRevisions,
  approvals,
  users,
  departments,
} from "@/lib/db/schema";
import { saveFile } from "@/lib/storage";
import { and, eq, or, ilike, inArray, sql, desc, count } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import {
  enqueueEmail,
  enqueueBulkEmail,
  enqueueNotification,
  enqueueBulkNotifications,
} from "@/lib/queue";
import { env } from "@/lib/env";

// --- Types ---

export type DocumentFilters = {
  search?: string;
  departmentId?: string;
  documentType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type DocumentListItem = {
  id: string;
  documentCode: string;
  title: string;
  currentRevisionNo: number;
  status: string;
  documentType: string;
  publishedAt: Date | null;
  createdAt: Date;
  departmentName: string;
  uploaderName: string;
  readConfirmed: number;
  readTotal: number;
};

export type DocumentDetail = Awaited<ReturnType<typeof getDocumentById>>;

// --- Helpers ---

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

// --- Queries ---

export async function getDocuments(filters: DocumentFilters = {}) {
  const session = await getSession();
  const { search, departmentId, documentType, status, page = 1, pageSize = 20 } = filters;

  const conditions = [eq(documents.isDeleted, false)];

  if (search) {
    conditions.push(
      or(
        ilike(documents.title, `%${search}%`),
        ilike(documents.documentCode, `%${search}%`),
      )!,
    );
  }

  if (documentType) {
    conditions.push(eq(documents.documentType, documentType as "PROCEDURE" | "INSTRUCTION" | "FORM"));
  }

  if (status) {
    conditions.push(
      eq(
        documents.status,
        status as "DRAFT" | "PENDING_APPROVAL" | "INTERMEDIATE_APPROVAL" | "APPROVED" | "PUBLISHED" | "REVISION" | "PASSIVE" | "CANCELLED",
      ),
    );
  }

  // Department filter: show docs where departmentId matches OR where doc appears in distribution_lists for that department
  if (departmentId) {
    const distributedDocIds = db
      .select({ documentId: distributionLists.documentId })
      .from(distributionLists)
      .where(eq(distributionLists.departmentId, departmentId));

    conditions.push(
      or(
        eq(documents.departmentId, departmentId),
        inArray(documents.id, distributedDocIds),
      )!,
    );
  }

  const where = and(...conditions);

  const [docsResult, totalResult] = await Promise.all([
    db
      .select({
        id: documents.id,
        documentCode: documents.documentCode,
        title: documents.title,
        currentRevisionNo: documents.currentRevisionNo,
        status: documents.status,
        documentType: documents.documentType,
        publishedAt: documents.publishedAt,
        createdAt: documents.createdAt,
        departmentName: departments.name,
        uploaderName: users.name,
      })
      .from(documents)
      .leftJoin(departments, eq(documents.departmentId, departments.id))
      .leftJoin(users, eq(documents.uploadedById, users.id))
      .where(where)
      .orderBy(desc(documents.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: count() })
      .from(documents)
      .where(where),
  ]);

  // Get read confirmation stats for all fetched documents
  const docIds = docsResult.map((d) => d.id);
  let readStats: Record<string, { confirmed: number; total: number }> = {};

  if (docIds.length > 0) {
    const stats = await db
      .select({
        documentId: readConfirmations.documentId,
        total: count(),
        confirmed: count(readConfirmations.confirmedAt),
      })
      .from(readConfirmations)
      .where(inArray(readConfirmations.documentId, docIds))
      .groupBy(readConfirmations.documentId);

    readStats = Object.fromEntries(
      stats.map((s) => [s.documentId, { confirmed: s.confirmed, total: s.total }]),
    );
  }

  const data: DocumentListItem[] = docsResult.map((doc) => ({
    id: doc.id,
    documentCode: doc.documentCode,
    title: doc.title,
    currentRevisionNo: doc.currentRevisionNo,
    status: doc.status,
    documentType: doc.documentType,
    publishedAt: doc.publishedAt,
    createdAt: doc.createdAt,
    departmentName: doc.departmentName ?? "",
    uploaderName: doc.uploaderName ?? "",
    readConfirmed: readStats[doc.id]?.confirmed ?? 0,
    readTotal: readStats[doc.id]?.total ?? 0,
  }));

  return {
    data,
    total: totalResult[0]?.count ?? 0,
    page,
    pageSize,
  };
}

export async function getDocumentById(id: string) {
  const session = await getSession();

  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.isDeleted, false)),
    with: {
      department: true,
      uploadedBy: true,
      preparerDepartment: true,
      approver: true,
      revisions: {
        orderBy: (rev, { desc }) => [desc(rev.revisionNo)],
        with: { createdBy: true },
      },
      approvals: {
        orderBy: (appr, { desc }) => [desc(appr.createdAt)],
        with: { approver: true },
      },
      distributionLists: {
        with: { department: true },
      },
      distributionUsers: {
        with: { user: true },
      },
      readConfirmations: {
        with: { user: true },
      },
      activityLogs: {
        orderBy: (log, { desc }) => [desc(log.createdAt)],
        with: { user: true },
      },
    },
  });

  if (!doc) throw new Error("Document not found");

  return doc;
}

// --- Mutations ---

const createDocumentSchema = z.object({
  documentCode: z.string().min(1, "Document code is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  documentType: z.enum(["PROCEDURE", "INSTRUCTION", "FORM"]),
  departmentId: z.string().min(1, "Department is required"),
  preparerDepartmentId: z.string().optional(),
  approverId: z.string().optional(),
  distributionDepartmentIds: z.string().optional(), // comma-separated
  distributionUserIds: z.string().optional(), // comma-separated
});

export async function createDocument(formData: FormData) {
  const session = await getSession();

  const raw = {
    documentCode: formData.get("documentCode") as string,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || undefined,
    documentType: formData.get("documentType") as string,
    departmentId: formData.get("departmentId") as string,
    preparerDepartmentId: (formData.get("preparerDepartmentId") as string) || undefined,
    approverId: (formData.get("approverId") as string) || undefined,
    distributionDepartmentIds: (formData.get("distributionDepartmentIds") as string) || undefined,
    distributionUserIds: (formData.get("distributionUserIds") as string) || undefined,
  };

  const parsed = createDocumentSchema.parse(raw);
  const file = formData.get("file") as File | null;

  // Create the document
  const [doc] = await db
    .insert(documents)
    .values({
      documentCode: parsed.documentCode,
      title: parsed.title,
      description: parsed.description,
      documentType: parsed.documentType as "PROCEDURE" | "INSTRUCTION" | "FORM",
      departmentId: parsed.departmentId,
      preparerDepartmentId: parsed.preparerDepartmentId || null,
      approverId: parsed.approverId || null,
      uploadedById: session.user.id,
      status: parsed.approverId ? "PENDING_APPROVAL" : "DRAFT",
    })
    .returning();

  // Save file if provided
  if (file && file.size > 0) {
    const fileMeta = await saveFile(file, doc.id);
    await db
      .update(documents)
      .set({
        filePath: fileMeta.path,
        fileName: fileMeta.fileName,
        fileSize: fileMeta.size,
        mimeType: fileMeta.mimeType,
      })
      .where(eq(documents.id, doc.id));

    // Create initial revision record (Rev.01)
    await db.insert(documentRevisions).values({
      documentId: doc.id,
      revisionNo: 1,
      filePath: fileMeta.path,
      fileName: fileMeta.fileName,
      fileSize: fileMeta.size,
      mimeType: fileMeta.mimeType,
      changes: "Initial upload",
      status: doc.status,
      createdById: session.user.id,
    });
  }

  // Create distribution list entries
  if (parsed.distributionDepartmentIds) {
    const deptIds = parsed.distributionDepartmentIds.split(",").filter(Boolean);
    if (deptIds.length > 0) {
      await db.insert(distributionLists).values(
        deptIds.map((deptId) => ({
          documentId: doc.id,
          departmentId: deptId,
        })),
      );
    }
  }

  // Create distribution user entries (individual users)
  if (parsed.distributionUserIds) {
    const userIds = parsed.distributionUserIds.split(",").filter(Boolean);
    if (userIds.length > 0) {
      await db.insert(distributionUsers).values(
        userIds.map((userId) => ({
          documentId: doc.id,
          userId,
        })),
      );
    }
  }

  // Create approval record if approver specified
  if (parsed.approverId) {
    await db.insert(approvals).values({
      documentId: doc.id,
      approverId: parsed.approverId,
      approvalType: "FINAL",
      status: "PENDING",
    });
  }

  // Log activity
  await db.insert(activityLogs).values({
    documentId: doc.id,
    userId: session.user.id,
    action: "UPLOADED",
    details: { title: parsed.title, documentCode: parsed.documentCode },
  });

  revalidatePath("/documents");

  // Async notifications (non-critical)
  if (parsed.approverId) {
    try {
      const approver = await db.query.users.findFirst({
        where: eq(users.id, parsed.approverId),
        columns: { name: true, email: true },
      });

      const jobs: Promise<unknown>[] = [];

      if (approver) {
        jobs.push(enqueueEmail({
          to: approver.email,
          subjectKey: "approvalRequest",
          subjectParams: { title: parsed.title },
          templateName: "approval-request",
          templateProps: {
            approverName: approver.name,
            documentTitle: parsed.title,
            documentCode: parsed.documentCode,
            uploaderName: session.user.name,
            approvalUrl: `${env.NEXT_PUBLIC_APP_URL}/documents/${doc.id}`,
          },
        }));
      }

      jobs.push(enqueueNotification({
        userId: parsed.approverId,
        type: "APPROVAL_REQUEST",
        titleKey: "newApprovalRequest",
        messageParams: { docTitle: parsed.title, docCode: parsed.documentCode },
        relatedDocumentId: doc.id,
      }));

      await Promise.allSettled(jobs);
    } catch (error) {
      console.error("[createDocument] Failed to enqueue notifications:", error);
    }
  }

  return { success: true, id: doc.id };
}

export async function cancelDocument(id: string) {
  const session = await getSession();

  // Get document details with relationships
  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.isDeleted, false)),
    with: {
      approver: { columns: { id: true, name: true, email: true } },
      distributionLists: {
        with: { department: true },
      },
    },
  });

  if (!doc) throw new Error("Document not found");

  await db
    .update(documents)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(eq(documents.id, id));

  await db.insert(activityLogs).values({
    documentId: id,
    userId: session.user.id,
    action: "CANCELLED",
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);

  // Async notifications (non-critical)
  try {
    // Notify approver if document had pending approval
    if (doc.approverId && doc.status === "PENDING_APPROVAL") {
      const pendingApproval = await db.query.approvals.findFirst({
        where: and(
          eq(approvals.documentId, id),
          eq(approvals.approverId, doc.approverId),
          eq(approvals.status, "PENDING"),
        ),
      });

      if (pendingApproval && doc.approver) {
        await Promise.allSettled([
          enqueueNotification({
            userId: doc.approverId,
            type: "APPROVAL_REQUEST",
            titleKey: "documentCancelled",
            messageParams: { docTitle: doc.title, docCode: doc.documentCode },
            relatedDocumentId: id,
          }),
          enqueueEmail({
            to: doc.approver.email,
            subjectKey: "documentCancelled",
            subjectParams: { title: doc.title },
            templateName: "document-cancelled",
            templateProps: {
              recipientName: doc.approver.name,
              documentTitle: doc.title,
              documentCode: doc.documentCode,
              cancelledBy: session.user.name,
            },
          }),
        ]);
      }
    }

    // Notify distribution users if document was PUBLISHED
    if (doc.status === "PUBLISHED") {
      const allCancelUserIds = new Set<string>();

      if (doc.distributionLists.length > 0) {
        const deptIds = doc.distributionLists.map((d) => d.departmentId);
        const deptUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(inArray(users.departmentId, deptIds), eq(users.isActive, true)));
        deptUsers.forEach((u) => allCancelUserIds.add(u.id));
      }

      const indivUsers = await db
        .select({ userId: distributionUsers.userId })
        .from(distributionUsers)
        .where(eq(distributionUsers.documentId, id));
      indivUsers.forEach((u) => allCancelUserIds.add(u.userId));

      const cancelUserIds = Array.from(allCancelUserIds);

      if (cancelUserIds.length > 0) {
        const targetUsers = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(inArray(users.id, cancelUserIds));

        await Promise.allSettled([
          enqueueBulkNotifications({
            notifications: targetUsers.map((u) => ({
              userId: u.id,
              type: "READ_ASSIGNMENT" as const,
              titleKey: "documentCancelled",
              messageParams: { docTitle: doc.title, docCode: doc.documentCode },
              relatedDocumentId: id,
            })),
          }),
          enqueueBulkEmail({
            emails: targetUsers.map((u) => ({
              to: u.email,
              subjectKey: "documentCancelled",
              subjectParams: { title: doc.title },
              templateName: "document-cancelled" as const,
              templateProps: {
                recipientName: u.name,
                documentTitle: doc.title,
                documentCode: doc.documentCode,
                cancelledBy: session.user.name,
              },
            })),
          }),
        ]);
      }
    }
  } catch (error) {
    console.error("[cancelDocument] Failed to enqueue notifications:", error);
  }

  return { success: true };
}

export async function publishDocument(id: string) {
  const session = await getSession();

  const now = new Date();
  await db
    .update(documents)
    .set({ status: "PUBLISHED", publishedAt: now, updatedAt: now })
    .where(eq(documents.id, id));

  // Collect target user IDs from both department-based and individual distribution
  const allUserIds = new Set<string>();

  // Get users from distribution departments
  const distList = await db
    .select({ departmentId: distributionLists.departmentId })
    .from(distributionLists)
    .where(eq(distributionLists.documentId, id));

  const deptIds = distList.map((d) => d.departmentId);
  if (deptIds.length > 0) {
    const deptUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.departmentId, deptIds), eq(users.isActive, true)));
    deptUsers.forEach((u) => allUserIds.add(u.id));
  }

  // Get individually distributed users
  const distUsers = await db
    .select({ userId: distributionUsers.userId })
    .from(distributionUsers)
    .where(eq(distributionUsers.documentId, id));
  distUsers.forEach((u) => allUserIds.add(u.userId));

  const targetUserIds = Array.from(allUserIds);

  if (targetUserIds.length > 0) {
    // Create read confirmations (DB write)
    await db.insert(readConfirmations).values(
      targetUserIds.map((uid) => ({
        documentId: id,
        userId: uid,
      })),
    );
  }

  // Log activity (DB write)
  await db.insert(activityLogs).values({
    documentId: id,
    userId: session.user.id,
    action: "PUBLISHED",
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);

  // Async notifications (non-critical)
  try {
    if (targetUserIds.length > 0) {
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, id),
        columns: { title: true, documentCode: true },
      });

      const jobs: Promise<unknown>[] = [];

      jobs.push(enqueueBulkNotifications({
        notifications: targetUserIds.map((uid) => ({
          userId: uid,
          type: "READ_ASSIGNMENT" as const,
          titleKey: "newReadAssignment",
          messageParams: { docTitle: doc?.title ?? "", docCode: doc?.documentCode ?? "" },
          relatedDocumentId: id,
        })),
      }));

      const usersForEmail = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, targetUserIds));

      if (usersForEmail.length > 0) {
        jobs.push(enqueueBulkEmail({
          emails: usersForEmail.map((u) => ({
            to: u.email,
            subjectKey: "readAssignment",
            subjectParams: { title: doc?.title ?? "" },
            templateName: "read-assignment" as const,
            templateProps: {
              userName: u.name,
              documentTitle: doc?.title ?? "",
              documentCode: doc?.documentCode ?? "",
              publishedBy: session.user.name,
              readUrl: `${env.NEXT_PUBLIC_APP_URL}/documents/${id}`,
            },
          })),
        }));
      }

      await Promise.allSettled(jobs);
    }

    const docForUploader = await db.query.documents.findFirst({
      where: eq(documents.id, id),
      columns: { title: true, documentCode: true, uploadedById: true },
    });

    if (docForUploader && docForUploader.uploadedById !== session.user.id) {
      await enqueueNotification({
        userId: docForUploader.uploadedById,
        type: "READ_ASSIGNMENT",
        titleKey: "documentPublished",
        messageParams: { docTitle: docForUploader.title, docCode: docForUploader.documentCode },
        relatedDocumentId: id,
      });
    }
  } catch (error) {
    console.error("[publishDocument] Failed to enqueue notifications:", error);
  }

  return { success: true };
}

const reviseDocumentSchema = z.object({
  changes: z.string().optional(),
});

export async function reviseDocument(formData: FormData) {
  const session = await getSession();
  const documentId = formData.get("documentId") as string;
  const changes = (formData.get("changes") as string) || undefined;
  const file = formData.get("file") as File | null;

  if (!documentId) throw new Error("Document ID is required");
  if (!file || file.size === 0) throw new Error("File is required for revision");

  // Get current document
  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.isDeleted, false)),
  });

  if (!doc) throw new Error("Document not found");

  const newRevisionNo = doc.currentRevisionNo + 1;

  // Save file
  const fileMeta = await saveFile(file, documentId);

  // Create revision record
  await db.insert(documentRevisions).values({
    documentId,
    revisionNo: newRevisionNo,
    filePath: fileMeta.path,
    fileName: fileMeta.fileName,
    fileSize: fileMeta.size,
    mimeType: fileMeta.mimeType,
    changes,
    status: doc.status,
    createdById: session.user.id,
  });

  // Update document
  await db
    .update(documents)
    .set({
      currentRevisionNo: newRevisionNo,
      filePath: fileMeta.path,
      fileName: fileMeta.fileName,
      fileSize: fileMeta.size,
      mimeType: fileMeta.mimeType,
      status: "REVISION",
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  // Log activity
  await db.insert(activityLogs).values({
    documentId,
    userId: session.user.id,
    action: "REVISED",
    details: { revisionNo: newRevisionNo, changes },
  });

  // Find the document's previous approver(s) from approvals table
  const previousApprovals = await db.query.approvals.findMany({
    where: eq(approvals.documentId, documentId),
    with: {
      approver: { columns: { id: true, name: true, email: true } },
    },
    orderBy: (approvals, { desc }) => [desc(approvals.createdAt)],
    limit: 1,
  });

  if (previousApprovals.length > 0 && previousApprovals[0]) {
    const lastApproval = previousApprovals[0];

    // Create new pending approval record for the approver
    await db.insert(approvals).values({
      documentId,
      approverId: lastApproval.approverId,
      approvalType: lastApproval.approvalType,
      status: "PENDING",
    });

    // Update document status to PENDING_APPROVAL
    await db
      .update(documents)
      .set({ status: "PENDING_APPROVAL" })
      .where(eq(documents.id, documentId));

    // Async notifications (non-critical)
    try {
      await Promise.allSettled([
        enqueueNotification({
          userId: lastApproval.approverId,
          type: "APPROVAL_REQUEST",
          titleKey: "documentRevised",
          messageParams: { docTitle: doc.title, docCode: doc.documentCode, version: newRevisionNo },
          relatedDocumentId: documentId,
        }),
        enqueueEmail({
          to: lastApproval.approver.email,
          subjectKey: "documentRevised",
          subjectParams: { title: doc.title },
          templateName: "document-revised",
          templateProps: {
            recipientName: lastApproval.approver.name,
            documentTitle: doc.title,
            documentCode: doc.documentCode,
            revisedBy: session.user.name,
            revisionNotes: changes,
            documentUrl: `${env.NEXT_PUBLIC_APP_URL}/documents/${documentId}`,
          },
        }),
      ]);
    } catch (error) {
      console.error("[reviseDocument] Failed to enqueue notifications:", error);
    }
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  return { success: true, revisionNo: newRevisionNo };
}

// --- Data loaders for forms ---

export async function getDepartments() {
  return db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(and(eq(departments.isActive, true), eq(departments.isDeleted, false)));
}

export async function getApprovers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      departmentName: departments.name,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(
      and(
        eq(users.isActive, true),
        or(eq(users.role, "MANAGER"), eq(users.role, "ADMIN")),
      ),
    );
}

export async function getAllActiveUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      departmentId: users.departmentId,
      departmentName: departments.name,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.isActive, true));
}
