import { createDatabaseClient } from "@stream/database";
import {
  VIDEO_PROCESSING_QUEUE,
  VIDEO_PROCESS_JOB,
  VIDEO_PIPELINE_VERSION,
  videoProcessingDefaults,
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
    if (job.data.pipelineVersion !== VIDEO_PIPELINE_VERSION)
      throw new Error("STALE_VIDEO_PIPELINE_JOB");
    const attempts = job.opts.attempts ?? 1;
    await processVideo(database, storage, job.data.assetId, {
      finalAttempt: job.attemptsMade + 1 >= attempts,
      ffmpegTimeoutMs: integer(
        "FFMPEG_TIMEOUT_MS",
        videoProcessingDefaults.ffmpegTimeoutMs,
      ),
      ffmpegThreads: integer(
        "FFMPEG_THREADS",
        videoProcessingDefaults.ffmpegThreads,
      ),
      maxRenditionHeight: integer(
        "VIDEO_MAX_RENDITION_HEIGHT",
        videoProcessingDefaults.maxRenditionHeight,
      ),
    });
  },
  {
    connection: {
      host: redis.hostname,
      port: Number(redis.port || 6379),
      username: redis.username || undefined,
      password: redis.password || undefined,
    },
    concurrency: integer(
      "VIDEO_WORKER_CONCURRENCY",
      videoProcessingDefaults.workerConcurrency,
    ),
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

function integer(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`${name} invalid`);
  return value;
}
