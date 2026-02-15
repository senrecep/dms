"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  documents,
  documentRevisions,
  distributionLists,
  distributionUsers,
  readConfirmations,
  activityLogs,
  approvals,
  users,
  departments,
} from "@/lib/db/schema";
import { saveFile } from "@/lib/storage";
import { and, eq, or, ilike, inArray, sql, desc, count, asc, ne } from "drizzle-orm";
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
  preparerName: string;
  approverName: string;
  uploaderName: string;
  previousRevisionStatus: string | null;
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

  // Alias for current revision join
  const rev = documentRevisions;

  const conditions = [eq(documents.isDeleted, false)];

  if (search) {
    conditions.push(
      or(
        ilike(rev.title, `%${search}%`),
        ilike(documents.documentCode, `%${search}%`),
      )!,
    );
  }

  if (documentType) {
    conditions.push(eq(rev.documentType, documentType as "PROCEDURE" | "INSTRUCTION" | "FORM"));
  }

  if (status) {
    conditions.push(
      eq(
        rev.status,
        status as "DRAFT" | "PENDING_APPROVAL" | "PREPARER_APPROVED" | "PREPARER_REJECTED" | "APPROVED" | "APPROVER_REJECTED" | "PUBLISHED" | "CANCELLED",
      ),
    );
  }

  if (departmentId) {
    const distributedRevisionDocIds = db
      .select({ documentId: rev.documentId })
      .from(distributionLists)
      .innerJoin(rev, eq(distributionLists.revisionId, rev.id))
      .where(eq(distributionLists.departmentId, departmentId));

    conditions.push(
      or(
        eq(rev.departmentId, departmentId),
        inArray(documents.id, distributedRevisionDocIds),
      )!,
    );
  }

  const where = and(...conditions);

  // Aliases for preparer and approver
  const preparerUser = users;

  const [docsResult, totalResult] = await Promise.all([
    db
      .select({
        id: documents.id,
        documentCode: documents.documentCode,
        title: rev.title,
        currentRevisionNo: documents.currentRevisionNo,
        status: rev.status,
        documentType: rev.documentType,
        publishedAt: rev.publishedAt,
        createdAt: documents.createdAt,
        departmentName: departments.name,
        preparerName: sql<string>`preparer.name`.as("preparer_name"),
        approverName: sql<string>`approver_user.name`.as("approver_name"),
        uploaderName: sql<string>`creator.name`.as("uploader_name"),
        revisionId: rev.id,
      })
      .from(documents)
      .innerJoin(rev, eq(documents.currentRevisionId, rev.id))
      .leftJoin(departments, eq(rev.departmentId, departments.id))
      .leftJoin(
        sql`"user" as preparer`,
        sql`preparer.id = ${rev.preparerId}`,
      )
      .leftJoin(
        sql`"user" as approver_user`,
        sql`approver_user.id = ${rev.approverId}`,
      )
      .leftJoin(
        sql`"user" as creator`,
        sql`creator.id = ${rev.createdById}`,
      )
      .where(where)
      .orderBy(desc(documents.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: count() })
      .from(documents)
      .innerJoin(rev, eq(documents.currentRevisionId, rev.id))
      .leftJoin(departments, eq(rev.departmentId, departments.id))
      .where(where),
  ]);

  // Get read confirmation stats for current revisions
  const revisionIds = docsResult.map((d) => d.revisionId).filter(Boolean) as string[];
  let readStats: Record<string, { confirmed: number; total: number }> = {};

  if (revisionIds.length > 0) {
    const stats = await db
      .select({
        revisionId: readConfirmations.revisionId,
        total: count(),
        confirmed: count(readConfirmations.confirmedAt),
      })
      .from(readConfirmations)
      .where(inArray(readConfirmations.revisionId, revisionIds))
      .groupBy(readConfirmations.revisionId);

    readStats = Object.fromEntries(
      stats.map((s) => [s.revisionId, { confirmed: s.confirmed, total: s.total }]),
    );
  }

  // Get previous revision status for each document
  const docIds = docsResult.map((d) => d.id);
  let prevStatuses: Record<string, string | null> = {};

  if (docIds.length > 0) {
    // For each document, get the revision before the current one
    const prevRevisions = await db
      .select({
        documentId: documentRevisions.documentId,
        status: documentRevisions.status,
        revisionNo: documentRevisions.revisionNo,
      })
      .from(documentRevisions)
      .where(inArray(documentRevisions.documentId, docIds))
      .orderBy(documentRevisions.documentId, desc(documentRevisions.revisionNo));

    // Group by documentId and pick the second one (previous)
    const grouped: Record<string, Array<{ status: string; revisionNo: number }>> = {};
    for (const r of prevRevisions) {
      if (!grouped[r.documentId]) grouped[r.documentId] = [];
      grouped[r.documentId].push({ status: r.status, revisionNo: r.revisionNo });
    }
    for (const [docId, revs] of Object.entries(grouped)) {
      prevStatuses[docId] = revs.length > 1 ? revs[1].status : null;
    }
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
    preparerName: doc.preparerName ?? "",
    approverName: doc.approverName ?? "",
    uploaderName: doc.uploaderName ?? "",
    previousRevisionStatus: prevStatuses[doc.id] ?? null,
    readConfirmed: readStats[doc.revisionId]?.confirmed ?? 0,
    readTotal: readStats[doc.revisionId]?.total ?? 0,
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
      revisions: {
        orderBy: (rev, { desc }) => [desc(rev.revisionNo)],
        with: {
          preparer: { columns: { id: true, name: true, email: true } },
          approver: { columns: { id: true, name: true, email: true } },
          createdBy: { columns: { id: true, name: true, email: true } },
          department: { columns: { id: true, name: true } },
          preparerDepartment: { columns: { id: true, name: true } },
          approvals: {
            orderBy: (appr, { desc }) => [desc(appr.createdAt)],
            with: { approver: { columns: { id: true, name: true, email: true } } },
          },
          distributionLists: {
            with: { department: { columns: { id: true, name: true } } },
          },
          distributionUsers: {
            with: { user: { columns: { id: true, name: true, email: true } } },
          },
          readConfirmations: {
            with: { user: { columns: { id: true, name: true, email: true } } },
          },
        },
      },
      activityLogs: {
        orderBy: (log, { desc }) => [desc(log.createdAt)],
        with: { user: { columns: { id: true, name: true } } },
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
  preparerId: z.string().min(1, "Preparer is required"),
  approverId: z.string().optional(),
  distributionDepartmentIds: z.string().optional(), // comma-separated
  distributionUserIds: z.string().optional(), // comma-separated
  startingRevisionNo: z.coerce.number().int().min(0).optional(),
  action: z.enum(["save", "submit"]).optional(),
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
    preparerId: (formData.get("preparerId") as string) || session.user.id,
    approverId: (formData.get("approverId") as string) || undefined,
    distributionDepartmentIds: (formData.get("distributionDepartmentIds") as string) || undefined,
    distributionUserIds: (formData.get("distributionUserIds") as string) || undefined,
    startingRevisionNo: (formData.get("startingRevisionNo") as string) || "0",
    action: (formData.get("action") as string) || "save",
  };

  const parsed = createDocumentSchema.parse(raw);
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) throw new Error("File is required");

  const startingRevNo = parsed.startingRevisionNo ?? 0;
  const actionType = parsed.action ?? "save";
  const initialStatus = actionType === "submit" ? "PENDING_APPROVAL" : "DRAFT";

  // 1. Create master document
  const [doc] = await db
    .insert(documents)
    .values({
      documentCode: parsed.documentCode,
    })
    .returning();

  // 2. Save file
  const fileMeta = await saveFile(file, doc.id);

  // 3. Create first revision
  const [revision] = await db
    .insert(documentRevisions)
    .values({
      documentId: doc.id,
      revisionNo: startingRevNo,
      title: parsed.title,
      description: parsed.description,
      documentType: parsed.documentType as "PROCEDURE" | "INSTRUCTION" | "FORM",
      status: initialStatus,
      departmentId: parsed.departmentId,
      preparerDepartmentId: parsed.preparerDepartmentId || null,
      preparerId: parsed.preparerId,
      approverId: parsed.approverId || null,
      createdById: session.user.id,
      filePath: fileMeta.path,
      fileName: fileMeta.fileName,
      fileSize: fileMeta.size,
      mimeType: fileMeta.mimeType,
      changes: "Initial upload",
    })
    .returning();

  // 4. Update master document with currentRevisionId
  await db
    .update(documents)
    .set({
      currentRevisionId: revision.id,
      currentRevisionNo: startingRevNo,
    })
    .where(eq(documents.id, doc.id));

  // 5. Create distribution lists with revisionId
  if (parsed.distributionDepartmentIds) {
    const deptIds = parsed.distributionDepartmentIds.split(",").filter(Boolean);
    if (deptIds.length > 0) {
      await db.insert(distributionLists).values(
        deptIds.map((deptId) => ({
          revisionId: revision.id,
          departmentId: deptId,
        })),
      );
    }
  }

  // 6. Create distribution users with revisionId
  if (parsed.distributionUserIds) {
    const userIds = parsed.distributionUserIds.split(",").filter(Boolean);
    if (userIds.length > 0) {
      await db.insert(distributionUsers).values(
        userIds.map((userId) => ({
          revisionId: revision.id,
          userId,
        })),
      );
    }
  }

  // 7. Handle approval flow if submitting
  if (actionType === "submit") {
    await createApprovalFlow(revision.id, parsed.preparerId, parsed.approverId || null, doc.id, parsed.title, parsed.documentCode, session.user.name);
  }

  // 8. Log activity
  await db.insert(activityLogs).values({
    documentId: doc.id,
    revisionId: revision.id,
    userId: session.user.id,
    action: "UPLOADED",
    details: { title: parsed.title, documentCode: parsed.documentCode, revisionNo: startingRevNo },
  });

  revalidatePath("/documents");

  return { success: true, id: doc.id };
}

// Helper: create approval flow based on preparer/approver logic
async function createApprovalFlow(
  revisionId: string,
  preparerId: string,
  approverId: string | null,
  documentId: string,
  title: string,
  documentCode: string,
  uploaderName: string,
) {
  if (!approverId) return;

  if (preparerId !== approverId) {
    // Two-step: PREPARER first, then APPROVER
    await db.insert(approvals).values({
      revisionId,
      approverId: preparerId,
      approvalType: "PREPARER",
      status: "PENDING",
    });

    // Notify preparer
    try {
      const preparer = await db.query.users.findFirst({
        where: eq(users.id, preparerId),
        columns: { name: true, email: true },
      });

      if (preparer) {
        await Promise.allSettled([
          enqueueNotification({
            userId: preparerId,
            type: "APPROVAL_REQUEST",
            titleKey: "newApprovalRequest",
            messageParams: { docTitle: title, docCode: documentCode },
            relatedDocumentId: documentId,
            relatedRevisionId: revisionId,
          }),
          enqueueEmail({
            to: preparer.email,
            subjectKey: "approvalRequest",
            subjectParams: { title },
            templateName: "approval-request",
            templateProps: {
              approverName: preparer.name,
              documentTitle: title,
              documentCode,
              uploaderName,
              approvalUrl: `${env.NEXT_PUBLIC_APP_URL}/documents/${documentId}`,
            },
          }),
        ]);
      }
    } catch (error) {
      console.error("[createApprovalFlow] Failed to notify preparer:", error);
    }
  } else {
    // Single step: preparerId === approverId, skip preparer step
    await db.insert(approvals).values({
      revisionId,
      approverId,
      approvalType: "APPROVER",
      status: "PENDING",
    });

    // Notify approver
    try {
      const approver = await db.query.users.findFirst({
        where: eq(users.id, approverId),
        columns: { name: true, email: true },
      });

      if (approver) {
        await Promise.allSettled([
          enqueueNotification({
            userId: approverId,
            type: "APPROVAL_REQUEST",
            titleKey: "newApprovalRequest",
            messageParams: { docTitle: title, docCode: documentCode },
            relatedDocumentId: documentId,
            relatedRevisionId: revisionId,
          }),
          enqueueEmail({
            to: approver.email,
            subjectKey: "approvalRequest",
            subjectParams: { title },
            templateName: "approval-request",
            templateProps: {
              approverName: approver.name,
              documentTitle: title,
              documentCode,
              uploaderName,
              approvalUrl: `${env.NEXT_PUBLIC_APP_URL}/documents/${documentId}`,
            },
          }),
        ]);
      }
    } catch (error) {
      console.error("[createApprovalFlow] Failed to notify approver:", error);
    }
  }
}

// --- submitForApproval (NEW) ---

export async function submitForApproval(revisionId: string) {
  const session = await getSession();

  const revision = await db.query.documentRevisions.findFirst({
    where: eq(documentRevisions.id, revisionId),
    with: {
      document: { columns: { id: true, documentCode: true } },
    },
  });

  if (!revision) throw new Error("Revision not found");
  if (revision.status !== "DRAFT") throw new Error("Only DRAFT revisions can be submitted");

  // Update status to PENDING_APPROVAL
  await db
    .update(documentRevisions)
    .set({ status: "PENDING_APPROVAL" })
    .where(eq(documentRevisions.id, revisionId));

  // Create approval flow
  await createApprovalFlow(
    revisionId,
    revision.preparerId,
    revision.approverId,
    revision.documentId,
    revision.title,
    revision.document.documentCode,
    session.user.name,
  );

  // Log activity
  await db.insert(activityLogs).values({
    documentId: revision.documentId,
    revisionId,
    userId: session.user.id,
    action: "SUBMITTED",
    details: { title: revision.title, revisionNo: revision.revisionNo },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${revision.documentId}`);

  return { success: true };
}

// --- publishDocument (REWRITE) ---

export async function publishDocument(revisionId: string) {
  const session = await getSession();

  // Get revision with document info
  const revision = await db.query.documentRevisions.findFirst({
    where: eq(documentRevisions.id, revisionId),
    with: {
      document: { columns: { id: true, documentCode: true } },
      distributionLists: { with: { department: true } },
      distributionUsers: true,
    },
  });

  if (!revision) throw new Error("Revision not found");
  if (revision.status !== "APPROVED") throw new Error("Only APPROVED revisions can be published");

  // Verify caller is approver or ADMIN
  if (revision.approverId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("Only the approver or an admin can publish");
  }

  const now = new Date();

  // Update revision status
  await db
    .update(documentRevisions)
    .set({ status: "PUBLISHED", publishedAt: now })
    .where(eq(documentRevisions.id, revisionId));

  // Collect distribution users: departments + individual users
  const allUserIds = new Set<string>();

  if (revision.distributionLists.length > 0) {
    const deptIds = revision.distributionLists.map((d) => d.departmentId);
    const deptUsers = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(inArray(users.departmentId, deptIds), eq(users.isActive, true)));
    // Only MANAGER role users get read confirmations
    deptUsers.filter((u) => u.role === "MANAGER").forEach((u) => allUserIds.add(u.id));
  }

  if (revision.distributionUsers.length > 0) {
    const indivUserIds = revision.distributionUsers.map((u) => u.userId);
    // Check which of these are MANAGERs
    const indivUsers = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(inArray(users.id, indivUserIds), eq(users.isActive, true)));
    indivUsers.filter((u) => u.role === "MANAGER").forEach((u) => allUserIds.add(u.id));
  }

  const targetUserIds = Array.from(allUserIds);

  // Create read confirmations only for MANAGER role users
  if (targetUserIds.length > 0) {
    await db.insert(readConfirmations).values(
      targetUserIds.map((uid) => ({
        revisionId,
        userId: uid,
      })),
    );
  }

  // Log activity
  await db.insert(activityLogs).values({
    documentId: revision.documentId,
    revisionId,
    userId: session.user.id,
    action: "PUBLISHED",
    details: { title: revision.title, revisionNo: revision.revisionNo },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${revision.documentId}`);

  // Async notifications
  try {
    if (targetUserIds.length > 0) {
      const jobs: Promise<unknown>[] = [];

      jobs.push(enqueueBulkNotifications({
        notifications: targetUserIds.map((uid) => ({
          userId: uid,
          type: "READ_ASSIGNMENT" as const,
          titleKey: "newReadAssignment",
          messageParams: { docTitle: revision.title, docCode: revision.document.documentCode },
          relatedDocumentId: revision.documentId,
          relatedRevisionId: revisionId,
        })),
      }));

      const usersForEmail = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, targetUserIds));

      if (usersForEmail.length > 0) {
        jobs.push(enqueueBulkEmail({
          emails: usersForEmail.map((u) => ({
            to: u.email,
            subjectKey: "readAssignment",
            subjectParams: { title: revision.title },
            templateName: "read-assignment" as const,
            templateProps: {
              userName: u.name,
              documentTitle: revision.title,
              documentCode: revision.document.documentCode,
              publishedBy: session.user.name,
              readUrl: `${env.NEXT_PUBLIC_APP_URL}/documents/${revision.documentId}`,
            },
          })),
        }));
      }

      await Promise.allSettled(jobs);
    }

    // Notify uploader if different from publisher
    if (revision.createdById !== session.user.id) {
      await enqueueNotification({
        userId: revision.createdById,
        type: "READ_ASSIGNMENT",
        titleKey: "documentPublished",
        messageParams: { docTitle: revision.title, docCode: revision.document.documentCode },
        relatedDocumentId: revision.documentId,
        relatedRevisionId: revisionId,
      });
    }
  } catch (error) {
    console.error("[publishDocument] Failed to enqueue notifications:", error);
  }

  return { success: true };
}

// --- reviseDocument (REWRITE) ---

const reviseDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  documentType: z.enum(["PROCEDURE", "INSTRUCTION", "FORM"]).optional(),
  departmentId: z.string().optional(),
  preparerDepartmentId: z.string().optional(),
  preparerId: z.string().optional(),
  approverId: z.string().optional(),
  changes: z.string().optional(),
  distributionDepartmentIds: z.string().optional(),
  distributionUserIds: z.string().optional(),
  action: z.enum(["save", "submit"]).optional(),
});

export async function reviseDocument(formData: FormData) {
  const session = await getSession();
  const documentId = formData.get("documentId") as string;
  const file = formData.get("file") as File | null;

  if (!documentId) throw new Error("Document ID is required");
  if (!file || file.size === 0) throw new Error("File is required for revision");

  const raw = {
    title: (formData.get("title") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
    documentType: (formData.get("documentType") as string) || undefined,
    departmentId: (formData.get("departmentId") as string) || undefined,
    preparerDepartmentId: (formData.get("preparerDepartmentId") as string) || undefined,
    preparerId: (formData.get("preparerId") as string) || undefined,
    approverId: (formData.get("approverId") as string) || undefined,
    changes: (formData.get("changes") as string) || undefined,
    distributionDepartmentIds: (formData.get("distributionDepartmentIds") as string) || undefined,
    distributionUserIds: (formData.get("distributionUserIds") as string) || undefined,
    action: (formData.get("action") as string) || "save",
  };

  const parsed = reviseDocumentSchema.parse(raw);

  // Get document with current revision
  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.isDeleted, false)),
    with: {
      currentRevision: true,
    },
  });

  if (!doc) throw new Error("Document not found");
  if (!doc.currentRevision) throw new Error("No current revision found");

  const currentRevision = doc.currentRevision;
  const fileMeta = await saveFile(file, documentId);
  const actionType = parsed.action ?? "save";

  if (currentRevision.status === "DRAFT") {
    // OVERWRITE existing draft revision
    const updateData: Record<string, unknown> = {
      filePath: fileMeta.path,
      fileName: fileMeta.fileName,
      fileSize: fileMeta.size,
      mimeType: fileMeta.mimeType,
      updatedAt: new Date(),
    };

    if (parsed.title) updateData.title = parsed.title;
    if (parsed.description !== undefined) updateData.description = parsed.description;
    if (parsed.documentType) updateData.documentType = parsed.documentType;
    if (parsed.departmentId) updateData.departmentId = parsed.departmentId;
    if (parsed.preparerDepartmentId !== undefined) updateData.preparerDepartmentId = parsed.preparerDepartmentId || null;
    if (parsed.preparerId) updateData.preparerId = parsed.preparerId;
    if (parsed.approverId !== undefined) updateData.approverId = parsed.approverId || null;
    if (parsed.changes !== undefined) updateData.changes = parsed.changes;

    if (actionType === "submit") {
      updateData.status = "PENDING_APPROVAL";
    }

    await db
      .update(documentRevisions)
      .set(updateData)
      .where(eq(documentRevisions.id, currentRevision.id));

    // Update distribution if provided
    if (parsed.distributionDepartmentIds !== undefined) {
      // Delete existing and recreate
      await db.delete(distributionLists).where(eq(distributionLists.revisionId, currentRevision.id));
      const deptIds = (parsed.distributionDepartmentIds || "").split(",").filter(Boolean);
      if (deptIds.length > 0) {
        await db.insert(distributionLists).values(
          deptIds.map((deptId) => ({ revisionId: currentRevision.id, departmentId: deptId })),
        );
      }
    }

    if (parsed.distributionUserIds !== undefined) {
      await db.delete(distributionUsers).where(eq(distributionUsers.revisionId, currentRevision.id));
      const userIds = (parsed.distributionUserIds || "").split(",").filter(Boolean);
      if (userIds.length > 0) {
        await db.insert(distributionUsers).values(
          userIds.map((userId) => ({ revisionId: currentRevision.id, userId })),
        );
      }
    }

    // Handle approval flow if submitting
    if (actionType === "submit") {
      const effectivePreparerId = parsed.preparerId || currentRevision.preparerId;
      const effectiveApproverId = parsed.approverId !== undefined ? (parsed.approverId || null) : currentRevision.approverId;
      const effectiveTitle = parsed.title || currentRevision.title;

      await createApprovalFlow(
        currentRevision.id,
        effectivePreparerId,
        effectiveApproverId,
        documentId,
        effectiveTitle,
        doc.documentCode,
        session.user.name,
      );
    }

    // Log activity
    await db.insert(activityLogs).values({
      documentId,
      revisionId: currentRevision.id,
      userId: session.user.id,
      action: "REVISED",
      details: { revisionNo: currentRevision.revisionNo, changes: parsed.changes, overwrite: true },
    });

    revalidatePath("/documents");
    revalidatePath(`/documents/${documentId}`);
    return { success: true, revisionNo: currentRevision.revisionNo };
  } else {
    // Create NEW revision
    const newRevisionNo = doc.currentRevisionNo + 1;
    const newStatus = actionType === "submit" ? "PENDING_APPROVAL" : "DRAFT";

    const [newRevision] = await db
      .insert(documentRevisions)
      .values({
        documentId,
        revisionNo: newRevisionNo,
        title: parsed.title || currentRevision.title,
        description: parsed.description !== undefined ? parsed.description : currentRevision.description,
        documentType: (parsed.documentType || currentRevision.documentType) as "PROCEDURE" | "INSTRUCTION" | "FORM",
        status: newStatus,
        departmentId: parsed.departmentId || currentRevision.departmentId,
        preparerDepartmentId: parsed.preparerDepartmentId !== undefined
          ? (parsed.preparerDepartmentId || null)
          : currentRevision.preparerDepartmentId,
        preparerId: parsed.preparerId || currentRevision.preparerId,
        approverId: parsed.approverId !== undefined
          ? (parsed.approverId || null)
          : currentRevision.approverId,
        createdById: session.user.id,
        filePath: fileMeta.path,
        fileName: fileMeta.fileName,
        fileSize: fileMeta.size,
        mimeType: fileMeta.mimeType,
        changes: parsed.changes,
      })
      .returning();

    // Update master document
    await db
      .update(documents)
      .set({
        currentRevisionId: newRevision.id,
        currentRevisionNo: newRevisionNo,
      })
      .where(eq(documents.id, documentId));

    // Create distribution lists for new revision
    if (parsed.distributionDepartmentIds !== undefined) {
      const deptIds = (parsed.distributionDepartmentIds || "").split(",").filter(Boolean);
      if (deptIds.length > 0) {
        await db.insert(distributionLists).values(
          deptIds.map((deptId) => ({ revisionId: newRevision.id, departmentId: deptId })),
        );
      }
    } else {
      // Copy from previous revision
      const prevDists = await db
        .select({ departmentId: distributionLists.departmentId })
        .from(distributionLists)
        .where(eq(distributionLists.revisionId, currentRevision.id));
      if (prevDists.length > 0) {
        await db.insert(distributionLists).values(
          prevDists.map((d) => ({ revisionId: newRevision.id, departmentId: d.departmentId })),
        );
      }
    }

    if (parsed.distributionUserIds !== undefined) {
      const userIds = (parsed.distributionUserIds || "").split(",").filter(Boolean);
      if (userIds.length > 0) {
        await db.insert(distributionUsers).values(
          userIds.map((userId) => ({ revisionId: newRevision.id, userId })),
        );
      }
    } else {
      // Copy from previous revision
      const prevUsers = await db
        .select({ userId: distributionUsers.userId })
        .from(distributionUsers)
        .where(eq(distributionUsers.revisionId, currentRevision.id));
      if (prevUsers.length > 0) {
        await db.insert(distributionUsers).values(
          prevUsers.map((u) => ({ revisionId: newRevision.id, userId: u.userId })),
        );
      }
    }

    // Handle approval flow if submitting
    if (actionType === "submit") {
      const effectivePreparerId = parsed.preparerId || currentRevision.preparerId;
      const effectiveApproverId = parsed.approverId !== undefined ? (parsed.approverId || null) : currentRevision.approverId;
      const effectiveTitle = parsed.title || currentRevision.title;

      await createApprovalFlow(
        newRevision.id,
        effectivePreparerId,
        effectiveApproverId,
        documentId,
        effectiveTitle,
        doc.documentCode,
        session.user.name,
      );
    }

    // Log activity
    await db.insert(activityLogs).values({
      documentId,
      revisionId: newRevision.id,
      userId: session.user.id,
      action: "REVISED",
      details: { revisionNo: newRevisionNo, changes: parsed.changes },
    });

    revalidatePath("/documents");
    revalidatePath(`/documents/${documentId}`);
    return { success: true, revisionNo: newRevisionNo };
  }
}

// --- cancelDocument (UPDATE) ---

export async function cancelDocument(documentId: string) {
  const session = await getSession();

  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.isDeleted, false)),
    with: {
      currentRevision: {
        with: {
          approver: { columns: { id: true, name: true, email: true } },
          distributionLists: { with: { department: true } },
        },
      },
    },
  });

  if (!doc) throw new Error("Document not found");
  if (!doc.currentRevision) throw new Error("No current revision found");

  const revision = doc.currentRevision;

  // Cancel the current revision
  await db
    .update(documentRevisions)
    .set({ status: "CANCELLED" })
    .where(eq(documentRevisions.id, revision.id));

  // Log activity with revisionId
  await db.insert(activityLogs).values({
    documentId,
    revisionId: revision.id,
    userId: session.user.id,
    action: "CANCELLED",
    details: { title: revision.title, revisionNo: revision.revisionNo },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);

  // Async notifications
  try {
    if (revision.approverId && revision.status === "PENDING_APPROVAL" && revision.approver) {
      const pendingApproval = await db.query.approvals.findFirst({
        where: and(
          eq(approvals.revisionId, revision.id),
          eq(approvals.status, "PENDING"),
        ),
      });

      if (pendingApproval) {
        await Promise.allSettled([
          enqueueNotification({
            userId: revision.approverId,
            type: "APPROVAL_REQUEST",
            titleKey: "documentCancelled",
            messageParams: { docTitle: revision.title, docCode: doc.documentCode },
            relatedDocumentId: documentId,
            relatedRevisionId: revision.id,
          }),
          enqueueEmail({
            to: revision.approver.email,
            subjectKey: "documentCancelled",
            subjectParams: { title: revision.title },
            templateName: "document-cancelled",
            templateProps: {
              recipientName: revision.approver.name,
              documentTitle: revision.title,
              documentCode: doc.documentCode,
              cancelledBy: session.user.name,
            },
          }),
        ]);
      }
    }

    if (revision.status === "PUBLISHED") {
      const allCancelUserIds = new Set<string>();

      if (revision.distributionLists.length > 0) {
        const deptIds = revision.distributionLists.map((d) => d.departmentId);
        const deptUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(inArray(users.departmentId, deptIds), eq(users.isActive, true)));
        deptUsers.forEach((u) => allCancelUserIds.add(u.id));
      }

      const indivUsers = await db
        .select({ userId: distributionUsers.userId })
        .from(distributionUsers)
        .where(eq(distributionUsers.revisionId, revision.id));
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
              messageParams: { docTitle: revision.title, docCode: doc.documentCode },
              relatedDocumentId: documentId,
              relatedRevisionId: revision.id,
            })),
          }),
          enqueueBulkEmail({
            emails: targetUsers.map((u) => ({
              to: u.email,
              subjectKey: "documentCancelled",
              subjectParams: { title: revision.title },
              templateName: "document-cancelled" as const,
              templateProps: {
                recipientName: u.name,
                documentTitle: revision.title,
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

// --- exportDocumentsToExcel (UPDATE) ---

export async function exportDocumentsToExcel(filters: DocumentFilters = {}) {
  const session = await getSession();

  // Reuse getDocuments logic
  const result = await getDocuments(filters);

  // Return data suitable for Excel export with new columns
  return result.data.map((doc) => ({
    documentCode: doc.documentCode,
    title: doc.title,
    revisionNo: doc.currentRevisionNo,
    status: doc.status,
    documentType: doc.documentType,
    departmentName: doc.departmentName,
    preparerName: doc.preparerName,
    approverName: doc.approverName,
    publishedAt: doc.publishedAt?.toISOString() ?? "",
    readConfirmed: doc.readConfirmed,
    readTotal: doc.readTotal,
  }));
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
