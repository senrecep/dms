import { db } from "@/lib/db";
import {
  approvals,
  users,
  documents,
  departments,
  systemSettings,
} from "@/lib/db/schema";
import { eq, and, lt, isNull } from "drizzle-orm";
import { enqueueEmail, enqueueNotification } from "@/lib/queue";
import { env } from "@/lib/env";

export async function runApprovalEscalations() {
  const results = {
    processed: 0,
    escalated: 0,
    errors: 0,
  };

  try {
    // 1. Get escalation days from system settings or env
    const escalationDaysSetting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, "default_escalation_days"),
    });
    const escalationDays =
      parseInt(escalationDaysSetting?.value || "") ||
      env.DEFAULT_ESCALATION_DAYS;

    // 2. Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - escalationDays);

    // 3. Find pending approvals that need escalation
    const pendingApprovals = await db
      .select({
        approval: approvals,
        approver: users,
        document: documents,
      })
      .from(approvals)
      .innerJoin(users, eq(approvals.approverId, users.id))
      .innerJoin(documents, eq(approvals.documentId, documents.id))
      .where(
        and(
          eq(approvals.status, "PENDING"),
          lt(approvals.createdAt, cutoffDate),
          isNull(approvals.escalatedAt),
        ),
      );

    console.log(
      `[ApprovalEscalation] Found ${pendingApprovals.length} approvals needing escalation`,
    );

    // 4. Process each approval
    for (const { approval, approver, document } of pendingApprovals) {
      results.processed++;

      try {
        // Find escalation target: department manager or admin
        let escalationTarget = null;

        // First try to find department manager
        if (approver.departmentId) {
          const dept = await db.query.departments.findFirst({
            where: eq(departments.id, approver.departmentId),
            with: {
              manager: true,
            },
          });

          if (dept?.manager && dept.manager.id !== approver.id) {
            escalationTarget = dept.manager;
          }
        }

        // If no department manager, find any admin
        if (!escalationTarget) {
          const admin = await db.query.users.findFirst({
            where: and(eq(users.role, "ADMIN"), eq(users.isActive, true)),
          });
          escalationTarget = admin;
        }

        if (!escalationTarget) {
          console.error(
            `[ApprovalEscalation] No escalation target found for approval ${approval.id}`,
          );
          results.errors++;
          continue;
        }

        // Calculate days pending
        const daysPending = Math.floor(
          (Date.now() - new Date(approval.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        const approvalUrl = `${env.NEXT_PUBLIC_APP_URL}/approvals/${approval.id}`;

        // Enqueue escalation email
        await enqueueEmail({
          to: escalationTarget.email,
          subjectKey: "escalation",
          subjectParams: { title: document.title },
          templateName: "escalation-notice",
          templateProps: {
            managerName: escalationTarget.name,
            documentTitle: document.title,
            documentCode: document.documentCode,
            originalApprover: approver.name,
            daysPending,
            approvalUrl,
          },
        });

        // Enqueue notification for manager
        await enqueueNotification({
          userId: escalationTarget.id,
          type: "ESCALATION",
          titleKey: "escalationNotice",
          messageParams: { docTitle: document.title, docCode: document.documentCode, approverName: approver.name, days: daysPending },
          relatedDocumentId: document.id,
        });

        // Notify original approver about escalation
        await enqueueNotification({
          userId: approver.id,
          type: "ESCALATION",
          titleKey: "approvalEscalated",
          messageParams: { docTitle: document.title, docCode: document.documentCode, days: daysPending },
          relatedDocumentId: document.id,
        });

        // Notify document uploader about escalation
        if (document.uploadedById && document.uploadedById !== escalationTarget.id) {
          await enqueueNotification({
            userId: document.uploadedById,
            type: "ESCALATION",
            titleKey: "documentEscalated",
            messageParams: { docTitle: document.title, docCode: document.documentCode, escalationTarget: escalationTarget.name },
            relatedDocumentId: document.id,
          });
        }

        // Update escalatedAt
        await db
          .update(approvals)
          .set({ escalatedAt: new Date() })
          .where(eq(approvals.id, approval.id));

        results.escalated++;
        console.log(
          `[ApprovalEscalation] Escalated approval ${approval.id} to ${escalationTarget.email}`,
        );
      } catch (error) {
        console.error(
          `[ApprovalEscalation] Error processing approval ${approval.id}:`,
          error,
        );
        results.errors++;
      }
    }

    console.log("[ApprovalEscalation] Job completed:", results);
    return results;
  } catch (error) {
    console.error("[ApprovalEscalation] Job failed:", error);
    throw error;
  }
}
