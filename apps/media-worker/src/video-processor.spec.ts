import {
  MediaKind,
  MediaPurpose,
  MediaStatus,
  type DatabaseClient,
} from "@stream/database";
import { VIDEO_PIPELINE_VERSION } from "@stream/media";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runProcess } from "./process-runner.js";
import type { WorkerStorage } from "./storage.js";
import { processVideo } from "./video-processor.js";

const temporary: string[] = [];
afterEach(async () =>
  Promise.all(
    temporary
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  ),
);

function harness(source: string, output: string) {
  const asset = {
    id: "20000000-0000-4000-8000-000000000099",
    ownerId: "10000000-0000-4000-8000-000000000001",
    kind: MediaKind.VIDEO,
    purpose: MediaPurpose.LONG_VIDEO,
    status: MediaStatus.UPLOADED,
    sourceKey: "source",
    publicUrl: null,
    mimeType: "video/mp4",
    byteSize: 1n,
    width: null,
    height: null,
    durationMs: null,
    blurDataUrl: null,
    failureCode: null,
    failureMessage: null,
    pipelineVersion: VIDEO_PIPELINE_VERSION,
    hlsManifestKey: null,
    posterKey: null,
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let uploads = 0;
  const database = {
    mediaAsset: {
      findUnique: async () => asset,
      update: async ({ data }: { data: Record<string, unknown> }) =>
        Object.assign(asset, data),
    },
  } as unknown as DatabaseClient;
  const storage = {
    download: async (_key: string, destination: string) =>
      copyFile(source, destination),
    upload: async (key: string, file: string) => {
      uploads += 1;
      await copyFile(file, join(output, key.replaceAll("/", "-")));
    },
  } as unknown as WorkerStorage;
  return { asset, database, storage, uploads: () => uploads };
}

describe("real video processor", () => {
  it("creates HLS and poster with real FFmpeg and is idempotent once READY", async () => {
    const dir = await mkdtemp(join(tmpdir(), "miru-worker-test-"));
    temporary.push(dir);
    const source = join(dir, "fixture.mp4");
    await runProcess(
      "ffmpeg",
      [
        "-nostdin",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=320x180:rate=24",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=1000",
        "-t",
        "1.5",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        source,
      ],
      60_000,
    );
    const test = harness(source, dir);
    await processVideo(test.database, test.storage, test.asset.id);
    expect(test.asset.status).toBe(MediaStatus.READY);
    expect(test.asset.hlsManifestKey).toMatch(/index\.m3u8$/);
    expect(test.asset.posterKey).toMatch(/poster\.jpg$/);
    const uploaded = test.uploads();
    await processVideo(test.database, test.storage, test.asset.id);
    expect(test.uploads()).toBe(uploaded);
  }, 120_000);

  it("marks an invalid source FAILED with a durable reason", async () => {
    const dir = await mkdtemp(join(tmpdir(), "miru-worker-fail-"));
    temporary.push(dir);
    const source = join(dir, "invalid.mp4");
    await writeFile(source, "not a video");
    const test = harness(source, dir);
    await expect(
      processVideo(test.database, test.storage, test.asset.id),
    ).rejects.toThrow();
    expect(test.asset.status).toBe(MediaStatus.FAILED);
    expect(test.asset.failureCode).toBeTruthy();
    expect(await readFile(source, "utf8")).toBe("not a video");
  });
});
