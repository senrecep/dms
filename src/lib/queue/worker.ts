import { Worker } from "bullmq";
import type { JobName, JobMap } from "./types";
import { processSendEmail } from "./jobs/send-email";
import { processSendBulkEmail } from "./jobs/send-bulk-email";
import { processCreateNotification } from "./jobs/create-notification";
import { processCreateBulkNotifications } from "./jobs/create-bulk-notifications";

const connection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};

export function createWorker() {
  const worker = new Worker<JobMap[JobName], unknown, JobName>(
    "dms-jobs",
    async (job) => {
      console.log(`[Worker] Processing job ${job.name} (${job.id})`);

      switch (job.name) {
        case "send-email":
          return processSendEmail(job as never);
        case "send-bulk-email":
          return processSendBulkEmail(job as never);
        case "create-notification":
          return processCreateNotification(job as never);
        case "create-bulk-notifications":
          return processCreateBulkNotifications(job as never);
        default:
          throw new Error(`Unknown job: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.name} (${job.id}) completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[Worker] Job ${job?.name} (${job?.id}) failed:`,
      err.message,
    );
  });

  worker.on("error", (err) => {
    console.error("[Worker] Error:", err.message);
  });

  return worker;
}
