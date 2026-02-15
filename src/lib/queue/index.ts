import { Queue } from "bullmq";
import type {
  JobMap,
  JobName,
  SendEmailPayload,
  SendBulkEmailPayload,
  CreateNotificationPayload,
  CreateBulkNotificationsPayload,
} from "./types";
import type { EmailTemplateName } from "./types";
import { getEmailLanguage } from "@/lib/email/config";
import { resolveSubject } from "@/lib/email/translations";

const globalForQueue = globalThis as unknown as {
  jobQueue: Queue | undefined;
};

function getJobQueue(): Queue {
  if (!globalForQueue.jobQueue) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    globalForQueue.jobQueue = new Queue("dms-jobs", { connection: { url } });
  }
  return globalForQueue.jobQueue;
}

// --- Generic enqueue ---

async function enqueue<T extends JobName>(
  name: T,
  data: JobMap[T],
  opts?: { attempts?: number; backoff?: { type: string; delay: number } },
) {
  await getJobQueue().add(name, data, {
    attempts: opts?.attempts ?? 3,
    backoff: opts?.backoff ?? { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 86400 }, // 24h
    removeOnFail: { age: 604800 }, // 7d
  });
}

// --- Typed helpers ---

export async function enqueueEmail(data: {
  to: string | string[];
  subjectKey: string;
  subjectParams?: Record<string, string | number>;
  templateName: EmailTemplateName;
  templateProps: Record<string, unknown>;
}) {
  const locale = await getEmailLanguage();
  const subject = resolveSubject(locale, data.subjectKey, data.subjectParams);

  await enqueue("send-email", {
    to: data.to,
    subject,
    templateName: data.templateName,
    templateProps: { ...data.templateProps, locale },
  }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function enqueueBulkEmail(data: {
  emails: Array<{
    to: string | string[];
    subjectKey: string;
    subjectParams?: Record<string, string | number>;
    templateName: EmailTemplateName;
    templateProps: Record<string, unknown>;
  }>;
}) {
  const locale = await getEmailLanguage();

  const resolved: SendBulkEmailPayload = {
    emails: data.emails.map((email) => ({
      to: email.to,
      subject: resolveSubject(locale, email.subjectKey, email.subjectParams),
      templateName: email.templateName,
      templateProps: { ...email.templateProps, locale },
    })),
  };

  await enqueue("send-bulk-email", resolved, {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function enqueueNotification(data: CreateNotificationPayload) {
  await enqueue("create-notification", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  });
}

export async function enqueueBulkNotifications(
  data: CreateBulkNotificationsPayload,
) {
  await enqueue("create-bulk-notifications", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}
