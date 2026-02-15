import type { Job } from "bullmq";
import type { SendBulkEmailPayload } from "../types";
import { sendBulkEmail } from "@/lib/email";
import { resolveTemplate } from "../templates";

export async function processSendBulkEmail(
  job: Job<SendBulkEmailPayload>,
) {
  const { emails } = job.data;

  const resolved = emails.map((email) => ({
    to: email.to,
    subject: email.subject,
    template: resolveTemplate(email.templateName, email.templateProps),
  }));

  await sendBulkEmail(resolved);

  console.log(`[Worker:send-bulk-email] Sent ${emails.length} emails`);
}
