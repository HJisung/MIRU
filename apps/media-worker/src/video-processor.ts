import type { DatabaseClient } from "@stream/database";
import { MediaKind, MediaStatus } from "@stream/database";
import {
  VIDEO_PIPELINE_VERSION,
  selectVideoRenditions,
  videoProcessingDefaults,
  videoUploadPolicy,
} from "@stream/media";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
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
  options: {
    finalAttempt?: boolean;
    ffmpegTimeoutMs?: number;
    ffmpegThreads?: number;
    maxRenditionHeight?: number;
  } = {},
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
  const poster = join(workDir, "poster.jpg");
  try {
    await storage.download(asset.sourceKey, source);
    const prefix = `derived/${assetId}/v${VIDEO_PIPELINE_VERSION}`;
    await storage.clearPrefix(prefix);
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

    const renditions = selectVideoRenditions(
      video.width,
      video.height,
      options.maxRenditionHeight ??
        envInteger(
          "VIDEO_MAX_RENDITION_HEIGHT",
          videoProcessingDefaults.maxRenditionHeight,
        ),
    );
    await Promise.all(
      renditions.map(({ name }) =>
        mkdir(join(workDir, name), { recursive: true }),
      ),
    );
    const hasAudio = probe.streams?.some(
      (stream) => stream.codec_type === "audio",
    );
    const split = renditions.map((_, index) => `[split${index}]`).join("");
    const filters = [
      `[0:v:0]split=${renditions.length}${split}`,
      ...renditions.map(
        (rendition, index) =>
          `[split${index}]scale=w=${rendition.width}:h=${rendition.height}[v${index}]`,
      ),
    ].join(";");
    const maps = renditions.flatMap((_, index) => [
      "-map",
      `[v${index}]`,
      ...(hasAudio ? ["-map", "0:a:0"] : []),
    ]);
    const rates = renditions.flatMap((rendition, index) => [
      `-b:v:${index}`,
      `${rendition.videoBitrateKbps}k`,
      `-maxrate:v:${index}`,
      `${Math.round(rendition.videoBitrateKbps * 1.07)}k`,
      `-bufsize:v:${index}`,
      `${rendition.videoBitrateKbps * 2}k`,
      ...(hasAudio ? [`-b:a:${index}`, `${rendition.audioBitrateKbps}k`] : []),
    ]);
    const streamMap = renditions
      .map((rendition, index) =>
        hasAudio
          ? `v:${index},a:${index},name:${rendition.name}`
          : `v:${index},name:${rendition.name}`,
      )
      .join(" ");
    await runProcess(
      process.env.FFMPEG_PATH ?? "ffmpeg",
      [
        "-nostdin",
        "-y",
        "-i",
        source,
        "-filter_complex",
        filters,
        ...maps,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-threads",
        String(
          options.ffmpegThreads ??
            envInteger("FFMPEG_THREADS", videoProcessingDefaults.ffmpegThreads),
        ),
        ...rates,
        ...(hasAudio ? ["-c:a", "aac"] : []),
        "-force_key_frames",
        `expr:gte(t,n_forced*${videoProcessingDefaults.segmentSeconds})`,
        "-sc_threshold",
        "0",
        "-hls_time",
        String(videoProcessingDefaults.segmentSeconds),
        "-hls_playlist_type",
        "vod",
        "-hls_flags",
        "independent_segments",
        "-master_pl_name",
        "master.m3u8",
        "-var_stream_map",
        streamMap,
        "-hls_segment_filename",
        ffmpegPath(workDir, "%v", "segment-%05d.ts"),
        ffmpegPath(workDir, "%v", "index.m3u8"),
      ],
      options.ffmpegTimeoutMs ??
        envInteger(
          "FFMPEG_TIMEOUT_MS",
          videoProcessingDefaults.ffmpegTimeoutMs,
        ),
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

    const files = await readdir(workDir, { recursive: true });
    for (const file of files.filter((name) => /\.(ts|m3u8|jpg)$/.test(name))) {
      const objectName = file.replaceAll("\\", "/");
      const contentType = objectName.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : objectName.endsWith(".ts")
          ? "video/mp2t"
          : "image/jpeg";
      await storage.upload(
        `${prefix}/${objectName}`,
        join(workDir, file),
        contentType,
      );
    }
    await database.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: MediaStatus.READY,
        width: video.width,
        height: video.height,
        durationMs: Math.round(durationSeconds * 1000),
        pipelineVersion: VIDEO_PIPELINE_VERSION,
        hlsManifestKey: `${prefix}/master.m3u8`,
        posterKey: `${prefix}/poster.jpg`,
        publicUrl: `/api/v1/media/assets/${assetId}/hls/master.m3u8`,
        mimeType: "application/vnd.apple.mpegurl",
        processedAt: new Date(),
        videoRenditions: renditions.map((rendition) => ({ ...rendition })),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "UNKNOWN_PROCESSING_ERROR";
    await database.mediaAsset.update({
      where: { id: assetId },
      data: {
        status:
          options.finalAttempt === false
            ? MediaStatus.PROCESSING
            : MediaStatus.FAILED,
        failureCode: message.split(":")[0]?.slice(0, 100),
        failureMessage: message.slice(0, 2000),
      },
    });
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function envInteger(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`${name}_INVALID`);
  return value;
}

function ffmpegPath(...parts: string[]) {
  return join(...parts).replaceAll("\\", "/");
}
