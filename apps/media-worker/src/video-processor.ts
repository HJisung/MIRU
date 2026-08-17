import type { DatabaseClient } from "@stream/database";
import { MediaKind, MediaStatus } from "@stream/database";
import { VIDEO_PIPELINE_VERSION, videoUploadPolicy } from "@stream/media";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runProcess } from "./process-runner.js";
import { WorkerStorage } from "./storage.js";

interface ProbeOutput {
  format?: { duration?: string; format_name?: string };
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
  }>;
}

export async function processVideo(
  database: DatabaseClient,
  storage: WorkerStorage,
  assetId: string,
) {
  const asset = await database.mediaAsset.findUnique({
    where: { id: assetId },
  });
  if (!asset || asset.kind !== MediaKind.VIDEO)
    throw new Error("VIDEO_ASSET_NOT_FOUND");
  if (
    asset.status === MediaStatus.READY &&
    asset.pipelineVersion === VIDEO_PIPELINE_VERSION
  )
    return;
  if (
    asset.status !== MediaStatus.UPLOADED &&
    asset.status !== MediaStatus.PROCESSING &&
    asset.status !== MediaStatus.FAILED
  ) {
    throw new Error(`INVALID_MEDIA_STATE_${asset.status}`);
  }

  await database.mediaAsset.update({
    where: { id: assetId },
    data: {
      status: MediaStatus.PROCESSING,
      failureCode: null,
      failureMessage: null,
    },
  });

  const workDir = await mkdtemp(join(tmpdir(), `miru-${assetId}-`));
  const source = join(workDir, "source");
  const manifest = join(workDir, "index.m3u8");
  const poster = join(workDir, "poster.jpg");
  try {
    await storage.download(asset.sourceKey, source);
    const probe = JSON.parse(
      await runProcess(
        process.env.FFPROBE_PATH ?? "ffprobe",
        [
          "-v",
          "error",
          "-print_format",
          "json",
          "-show_format",
          "-show_streams",
          source,
        ],
        60_000,
      ),
    ) as ProbeOutput;
    const video = probe.streams?.find(
      (stream) => stream.codec_type === "video",
    );
    const durationSeconds = Number(probe.format?.duration);
    const containers = new Set((probe.format?.format_name ?? "").split(","));
    if (
      ![...containers].some((name) =>
        ["mov", "mp4", "matroska", "webm"].includes(name),
      )
    ) {
      throw new Error("VIDEO_CONTAINER_NOT_ALLOWED");
    }
    if (!video?.width || !video.height || !Number.isFinite(durationSeconds))
      throw new Error("INVALID_VIDEO_METADATA");
    if (
      durationSeconds <= 0 ||
      durationSeconds > videoUploadPolicy.maxDurationSeconds
    )
      throw new Error("VIDEO_DURATION_NOT_ALLOWED");
    if (
      video.width > videoUploadPolicy.maxWidth ||
      video.height > videoUploadPolicy.maxHeight
    )
      throw new Error("VIDEO_RESOLUTION_NOT_ALLOWED");

    await runProcess(
      process.env.FFMPEG_PATH ?? "ffmpeg",
      [
        "-nostdin",
        "-y",
        "-i",
        source,
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-vf",
        "scale='min(1280,iw)':-2",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-hls_time",
        "6",
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        join(workDir, "segment-%05d.ts"),
        manifest,
      ],
      30 * 60_000,
    );
    await runProcess(
      process.env.FFMPEG_PATH ?? "ffmpeg",
      [
        "-nostdin",
        "-y",
        "-ss",
        String(Math.min(1, durationSeconds / 3)),
        "-i",
        source,
        "-frames:v",
        "1",
        "-vf",
        "scale='min(1280,iw)':-2",
        poster,
      ],
      120_000,
    );

    const prefix = `derived/${assetId}/v${VIDEO_PIPELINE_VERSION}`;
    const files = await readdir(workDir);
    for (const file of files.filter((name) => name.endsWith(".ts"))) {
      await storage.upload(
        `${prefix}/${file}`,
        join(workDir, file),
        "video/mp2t",
      );
    }
    await storage.upload(
      `${prefix}/index.m3u8`,
      manifest,
      "application/vnd.apple.mpegurl",
    );
    await storage.upload(`${prefix}/poster.jpg`, poster, "image/jpeg");
    await database.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: MediaStatus.READY,
        width: video.width,
        height: video.height,
        durationMs: Math.round(durationSeconds * 1000),
        pipelineVersion: VIDEO_PIPELINE_VERSION,
        hlsManifestKey: `${prefix}/index.m3u8`,
        posterKey: `${prefix}/poster.jpg`,
        publicUrl: `/api/v1/media/assets/${assetId}/hls/index.m3u8`,
        mimeType: "application/vnd.apple.mpegurl",
        processedAt: new Date(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "UNKNOWN_PROCESSING_ERROR";
    await database.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: MediaStatus.FAILED,
        failureCode: message.split(":")[0]?.slice(0, 100),
        failureMessage: message.slice(0, 2000),
      },
    });
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
