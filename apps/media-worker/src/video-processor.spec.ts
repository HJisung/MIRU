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
  let clears = 0;
  const artifacts = new Map<string, Buffer>();
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
      artifacts.set(key, await readFile(file));
      await copyFile(file, join(output, key.replaceAll("/", "-")));
    },
    clearPrefix: async () => {
      clears += 1;
    },
  } as unknown as WorkerStorage;
  return {
    asset,
    database,
    storage,
    uploads: () => uploads,
    clears: () => clears,
    artifacts,
  };
}

describe("real video processor", () => {
  it.each([
    { size: "1920x1080", expected: ["360p", "720p", "1080p"] },
    { size: "1280x720", expected: ["360p", "720p"] },
    { size: "320x180", expected: ["180p"] },
  ])(
    "creates source-bounded aligned ABR for $size",
    async ({ size, expected }) => {
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
          `testsrc=size=${size}:rate=24`,
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=1000",
          "-t",
          "0.8",
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
      await processVideo(test.database, test.storage, test.asset.id, {
        ffmpegThreads: 1,
      });
      expect(test.asset.status).toBe(MediaStatus.READY);
      expect(test.asset.hlsManifestKey).toMatch(/master\.m3u8$/);
      expect(test.asset.posterKey).toMatch(/poster\.jpg$/);
      const manifest = [...test.artifacts.entries()].find(([key]) =>
        key.endsWith("master.m3u8"),
      )?.[1];
      expect(manifest).toBeDefined();
      const text = manifest!.toString("utf8");
      const variants = text
        .split("\n")
        .filter((line) => line && !line.startsWith("#"));
      expect(variants).toEqual(expected.map((name) => `${name}/index.m3u8`));
      expect(text).toContain('CODECS="');
      for (const name of expected) {
        expect(text).toMatch(new RegExp("BANDWIDTH=\\d+"));
        expect(text).toContain("RESOLUTION=");
        expect(
          [...test.artifacts.keys()].some((key) =>
            key.endsWith(`${name}/index.m3u8`),
          ),
        ).toBe(true);
        expect(
          [...test.artifacts.keys()].some((key) =>
            key.includes(`${name}/segment-`),
          ),
        ).toBe(true);
      }
      expect(test.clears()).toBe(1);
      const uploaded = test.uploads();
      await processVideo(test.database, test.storage, test.asset.id);
      expect(test.uploads()).toBe(uploaded);
    },
    120_000,
  );

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
    expect(test.clears()).toBe(1);
    await expect(
      processVideo(test.database, test.storage, test.asset.id),
    ).rejects.toThrow();
    expect(test.clears()).toBe(2);
    expect(await readFile(source, "utf8")).toBe("not a video");
  });
});
