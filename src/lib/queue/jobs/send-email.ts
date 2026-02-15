import type { Job } from "bullmq";
import type { SendEmailPayload } from "../types";
import { sendEmail } from "@/lib/email";
import { resolveTemplate } from "../templates";

export async function processSendEmail(job: Job<SendEmailPayload>) {
  const { to, subject, templateName, templateProps } = job.data;

  const template = resolveTemplate(templateName, templateProps);
  const result = await sendEmail({ to, subject, template });

  if (!result.success) {
    throw new Error(`Email send failed: ${result.error}`);
  }

  console.log(`[Worker:send-email] Sent to ${Array.isArray(to) ? to.join(", ") : to} (${templateName})`);
  return result;
}
