import { createDatabaseClient } from "@stream/database";
import {
  VIDEO_PROCESSING_QUEUE,
  VIDEO_PROCESS_JOB,
  type ProcessVideoJob,
} from "@stream/media";
import { Worker } from "bullmq";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { processVideo } from "./video-processor.js";
import { WorkerStorage } from "./storage.js";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const database = createDatabaseClient(required("DATABASE_URL"));
const storage = new WorkerStorage();
const redis = new URL(required("REDIS_URL"));
const worker = new Worker<ProcessVideoJob>(
  VIDEO_PROCESSING_QUEUE,
  async (job) => {
    if (job.name !== VIDEO_PROCESS_JOB) throw new Error("UNKNOWN_MEDIA_JOB");
    const attempts = job.opts.attempts ?? 1;
    await processVideo(database, storage, job.data.assetId, {
      finalAttempt: job.attemptsMade + 1 >= attempts,
    });
  },
  {
    connection: {
      host: redis.hostname,
      port: Number(redis.port || 6379),
      username: redis.username || undefined,
      password: redis.password || undefined,
    },
    concurrency: 1,
    lockDuration: 30 * 60_000,
  },
);

worker.on("completed", (job) =>
  console.log(JSON.stringify({ event: "video.processed", jobId: job.id })),
);
worker.on("failed", (job, error) =>
  console.error(
    JSON.stringify({
      event: "video.failed",
      jobId: job?.id,
      error: error.message,
    }),
  ),
);

async function shutdown() {
  await worker.close();
  await database.$disconnect();
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
