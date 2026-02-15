import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  documents,
  documentRevisions,
  distributionLists,
  distributionUsers,
  activityLogs,
  approvals,
  users,
} from "@/lib/db/schema";
import { enqueueEmail, enqueueNotification } from "@/lib/queue";
import { env } from "@/lib/env";
import { saveFile } from "@/lib/storage";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { revalidatePath } from "next/cache";

const createDocumentSchema = z.object({
  documentCode: z.string().min(1, "Document code is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  documentType: z.enum(["PROCEDURE", "INSTRUCTION", "FORM"]),
  departmentId: z.string().min(1, "Department is required"),
  preparerDepartmentId: z.string().optional(),
  preparerId: z.string().min(1, "Preparer is required"),
  approverId: z.string().optional(),
  distributionDepartmentIds: z.string().optional(),
  distributionUserIds: z.string().optional(),
  startingRevisionNo: z.coerce.number().int().min(0).optional(),
  action: z.enum(["save", "submit"]).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    const raw = {
      documentCode: formData.get("documentCode") as string,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      documentType: formData.get("documentType") as string,
      departmentId: formData.get("departmentId") as string,
      preparerDepartmentId:
        (formData.get("preparerDepartmentId") as string) || undefined,
      preparerId: (formData.get("preparerId") as string) || session.user.id,
      approverId: (formData.get("approverId") as string) || undefined,
      distributionDepartmentIds:
        (formData.get("distributionDepartmentIds") as string) || undefined,
      distributionUserIds:
        (formData.get("distributionUserIds") as string) || undefined,
      startingRevisionNo: (formData.get("startingRevisionNo") as string) || "0",
      action: (formData.get("action") as string) || "save",
    };

    const parsed = createDocumentSchema.parse(raw);
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

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
      const deptIds = parsed.distributionDepartmentIds
        .split(",")
        .filter(Boolean);
      if (deptIds.length > 0) {
        await db.insert(distributionLists).values(
          deptIds.map((deptId) => ({
            revisionId: revision.id,
            departmentId: deptId,
          })),
        );
      }
    }

    // 6. Create distribution user entries with revisionId
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
    if (actionType === "submit" && parsed.approverId) {
      if (parsed.preparerId !== parsed.approverId) {
        // Two-step: PREPARER first
        await db.insert(approvals).values({
          revisionId: revision.id,
          approverId: parsed.preparerId,
          approvalType: "PREPARER",
          status: "PENDING",
        });

        // Notify preparer
        try {
          const preparer = await db.query.users.findFirst({
            where: eq(users.id, parsed.preparerId),
            columns: { name: true, email: true },
          });

          if (preparer) {
            await Promise.allSettled([
              enqueueNotification({
                userId: parsed.preparerId,
                type: "APPROVAL_REQUEST",
                titleKey: "newApprovalRequest",
                messageParams: { docTitle: parsed.title, docCode: parsed.documentCode },
                relatedDocumentId: doc.id,
                relatedRevisionId: revision.id,
              }),
              enqueueEmail({
                to: preparer.email,
                subjectKey: "approvalRequest",
                subjectParams: { title: parsed.title },
                templateName: "approval-request",
                templateProps: {
                  approverName: preparer.name,
                  documentTitle: parsed.title,
                  documentCode: parsed.documentCode,
                  uploaderName: session.user.name,
                  approvalUrl: `${env.NEXT_PUBLIC_APP_URL}/documents/${doc.id}`,
                },
              }),
            ]);
          }
        } catch (error) {
          console.error("[upload] Failed to notify preparer:", error);
        }
      } else {
        // Single step: preparerId === approverId
        await db.insert(approvals).values({
          revisionId: revision.id,
          approverId: parsed.approverId,
          approvalType: "APPROVER",
          status: "PENDING",
        });

        // Notify approver
        try {
          const approver = await db.query.users.findFirst({
            where: eq(users.id, parsed.approverId),
            columns: { name: true, email: true },
          });

          if (approver) {
            await Promise.allSettled([
              enqueueNotification({
                userId: parsed.approverId,
                type: "APPROVAL_REQUEST",
                titleKey: "newApprovalRequest",
                messageParams: { docTitle: parsed.title, docCode: parsed.documentCode },
                relatedDocumentId: doc.id,
                relatedRevisionId: revision.id,
              }),
              enqueueEmail({
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
              }),
            ]);
          }
        } catch (error) {
          console.error("[upload] Failed to notify approver:", error);
        }
      }
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

    return NextResponse.json({ success: true, id: doc.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
