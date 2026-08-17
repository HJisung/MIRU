# Media worker

Consumes the `video-processing` BullMQ queue. Each job downloads a private
source object, validates it with ffprobe, produces a single H.264/AAC HLS VOD
and JPEG poster, uploads deterministic versioned artifacts, and records
`READY` or `FAILED` on MediaAsset.

Run with `pnpm --filter @stream/media-worker dev`. FFmpeg and ffprobe must be on
PATH or configured through `FFMPEG_PATH` and `FFPROBE_PATH`.
