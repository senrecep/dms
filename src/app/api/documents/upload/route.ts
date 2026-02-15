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
  approverId: z.string().optional(),
  distributionDepartmentIds: z.string().optional(),
  distributionUserIds: z.string().optional(),
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
      approverId: (formData.get("approverId") as string) || undefined,
      distributionDepartmentIds:
        (formData.get("distributionDepartmentIds") as string) || undefined,
      distributionUserIds:
        (formData.get("distributionUserIds") as string) || undefined,
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
        documentType: parsed.documentType as
          | "PROCEDURE"
          | "INSTRUCTION"
          | "FORM",
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
      const deptIds = parsed.distributionDepartmentIds
        .split(",")
        .filter(Boolean);
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
        console.error("[upload] Failed to enqueue notifications:", error);
      }
    }

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
