# Media worker

Consumes the `video-processing` BullMQ queue. Each job downloads a private
source object, validates it with ffprobe, produces a single H.264/AAC HLS VOD
and JPEG poster, uploads deterministic versioned artifacts, and records
`READY` or `FAILED` on MediaAsset.

Run with `pnpm --filter @stream/media-worker dev`. FFmpeg and ffprobe must be on
PATH or configured through `FFMPEG_PATH` and `FFPROBE_PATH`.

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
