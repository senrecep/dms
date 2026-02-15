import { createWorker } from "./lib/queue/worker";

console.log("[Worker] Starting DMS job worker...");

const worker = createWorker();

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`[Worker] Received ${signal}, shutting down...`);
  await worker.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log("[Worker] Ready and waiting for jobs");
