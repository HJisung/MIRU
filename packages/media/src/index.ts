export const VIDEO_PROCESSING_QUEUE = "video-processing";
export const VIDEO_PROCESS_JOB = "process-video";
export const VIDEO_PIPELINE_VERSION = 1;

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
