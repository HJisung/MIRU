# Media worker

Consumes the `video-processing` BullMQ queue. Each job downloads a private
source object, validates it with ffprobe, produces source-bounded adaptive
H.264/AAC HLS variants and a JPEG poster, uploads deterministic versioned artifacts, and records
`READY` or `FAILED` on MediaAsset.

Run with `pnpm --filter @stream/media-worker dev`. FFmpeg and ffprobe must be on
PATH or configured through `FFMPEG_PATH` and `FFPROBE_PATH`.

Pipeline v2 writes `master.m3u8` plus aligned 360p, 720p, and 1080p variants
when the source supports them. Resource defaults are one worker job, two FFmpeg
threads, a 30-minute timeout, and a 1080p maximum. Configure them with
`VIDEO_WORKER_CONCURRENCY`, `FFMPEG_THREADS`, `FFMPEG_TIMEOUT_MS`, and
`VIDEO_MAX_RENDITION_HEIGHT`.

Before each attempt the worker clears only
`derived/{assetId}/v{pipelineVersion}` and rebuilds that deterministic output.
Retries therefore cannot accumulate partial segments and never delete the
private source upload.

Run the strongest local integration proof with Docker dependencies and FFmpeg
available:

```bash
pnpm --filter @stream/api exec vitest run test/video-pipeline.e2e-spec.ts
```

It uses real PostgreSQL, Redis, MinIO, BullMQ, ffprobe, and FFmpeg.
