export const VIDEO_PROCESSING_QUEUE = "video-processing";
export const VIDEO_PROCESS_JOB = "process-video";
export const VIDEO_PIPELINE_VERSION = 2;

export const videoProcessingDefaults = {
  workerConcurrency: 1,
  ffmpegTimeoutMs: 30 * 60_000,
  ffmpegThreads: 2,
  maxRenditionHeight: 1080,
  segmentSeconds: 6,
} as const;

export const videoRenditionLadder = [
  { name: "360p", height: 360, videoBitrateKbps: 800, audioBitrateKbps: 96 },
  { name: "720p", height: 720, videoBitrateKbps: 2_800, audioBitrateKbps: 128 },
  {
    name: "1080p",
    height: 1080,
    videoBitrateKbps: 5_000,
    audioBitrateKbps: 128,
  },
] as const;

export interface VideoRendition {
  name: string;
  width: number;
  height: number;
  videoBitrateKbps: number;
  audioBitrateKbps: number;
}

export function selectVideoRenditions(
  sourceWidth: number,
  sourceHeight: number,
  maxHeight: number = videoProcessingDefaults.maxRenditionHeight,
): VideoRendition[] {
  const allowedHeight = Math.min(sourceHeight, maxHeight);
  const selected = videoRenditionLadder
    .filter((profile) => profile.height <= allowedHeight)
    .map((profile) => ({
      ...profile,
      width: even(Math.round((sourceWidth * profile.height) / sourceHeight)),
    }));
  if (selected.length) return selected;
  const height = even(allowedHeight);
  return [
    {
      name: `${height}p`,
      width: even(Math.round((sourceWidth * height) / sourceHeight)),
      height,
      videoBitrateKbps: Math.min(800, Math.max(250, height * 2)),
      audioBitrateKbps: 96,
    },
  ];
}

function even(value: number) {
  return Math.max(2, value - (value % 2));
}

export const videoUploadPolicy = {
  mimeTypes: ["video/mp4", "video/quicktime", "video/webm"] as const,
  maxBytes: 500_000_000,
  maxDurationSeconds: 60 * 60 * 3,
  maxWidth: 3840,
  maxHeight: 2160,
};

export interface ProcessVideoJob {
  assetId: string;
  pipelineVersion: number;
}
