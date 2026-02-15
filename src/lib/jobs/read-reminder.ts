import { db } from "@/lib/db";
import {
  readConfirmations,
  users,
  documents,
  systemSettings,
} from "@/lib/db/schema";
import { eq, and, lt, isNull, or } from "drizzle-orm";
import { enqueueEmail, enqueueNotification } from "@/lib/queue";
import { env } from "@/lib/env";

export async function runReadReminders() {
  const results = {
    processed: 0,
    sent: 0,
    errors: 0,
  };

  try {
    // 1. Get reminder days from system settings or default to 3
    const reminderDaysSetting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, "read_reminder_days"),
    });
    const reminderDays = parseInt(reminderDaysSetting?.value || "3");

    // 2. Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - reminderDays);

    // Don't spam: only send if reminderSentAt is null OR was sent more than 1 day ago
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // 3. Find unconfirmed read confirmations that need reminders
    const unconfirmedReads = await db
      .select({
        readConfirmation: readConfirmations,
        user: users,
        document: documents,
      })
      .from(readConfirmations)
      .innerJoin(users, eq(readConfirmations.userId, users.id))
      .innerJoin(documents, eq(readConfirmations.documentId, documents.id))
      .where(
        and(
          isNull(readConfirmations.confirmedAt),
          lt(readConfirmations.createdAt, cutoffDate),
          or(
            isNull(readConfirmations.reminderSentAt),
            lt(readConfirmations.reminderSentAt, oneDayAgo),
          ),
        ),
      );

    console.log(
      `[ReadReminder] Found ${unconfirmedReads.length} read confirmations needing reminders`,
    );

    // 4. Process each read confirmation
    for (const { readConfirmation, user, document } of unconfirmedReads) {
      results.processed++;

      try {
        // Calculate days pending
        const daysPending = Math.floor(
          (Date.now() - new Date(readConfirmation.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        const readUrl = `${env.NEXT_PUBLIC_APP_URL}/read-tasks`;

        // Enqueue email
        await enqueueEmail({
          to: user.email,
          subjectKey: "readReminder",
          subjectParams: { title: document.title },
          templateName: "read-reminder",
          templateProps: {
            userName: user.name,
            documentTitle: document.title,
            documentCode: document.documentCode,
            daysPending,
            readUrl,
          },
        });

        // Enqueue notification
        await enqueueNotification({
          userId: user.id,
          type: "REMINDER",
          titleKey: "readReminder",
          messageParams: { docTitle: document.title, docCode: document.documentCode, days: daysPending },
          relatedDocumentId: document.id,
        });

        // Update reminderSentAt
        await db
          .update(readConfirmations)
          .set({ reminderSentAt: new Date() })
          .where(eq(readConfirmations.id, readConfirmation.id));

        results.sent++;
        console.log(
          `[ReadReminder] Enqueued reminder for ${user.email} (read confirmation ${readConfirmation.id})`,
        );
      } catch (error) {
        console.error(
          `[ReadReminder] Error processing read confirmation ${readConfirmation.id}:`,
          error,
        );
        results.errors++;
      }
    }

    console.log("[ReadReminder] Job completed:", results);
    return results;
  } catch (error) {
    console.error("[ReadReminder] Job failed:", error);
    throw error;
  }
}
