# ADR 0007: First video pipeline uses one HLS rendition

- Status: Accepted
- Date: 2026-08-17

## Decision

The API creates direct video upload sessions, verifies object size and declared
content type, transitions the MediaAsset to `UPLOADED`, and enqueues one
idempotent BullMQ job. The media worker downloads the private source to a unique
temporary directory, probes it with ffprobe, validates its real container,
duration, and dimensions, then creates a 720p-or-smaller H.264/AAC HLS VOD and
JPEG poster with FFmpeg.

Generated objects use `derived/{assetId}/v{pipelineVersion}`. The manifest,
poster, normalized metadata, and pipeline version are persisted on MediaAsset.
Only after every required upload succeeds does the worker mark the asset
`READY`. Home, Series single works, Series episodes, and video Shortforms all
attach the same processed MediaAsset directly; product publication remains a
separate explicit decision.

## Why one rendition

One rendition proves direct upload, durable queueing, safe process execution,
artifact storage, retries, and browser HLS playback without pretending that a
complete production ABR ladder exists. The deterministic versioned prefix lets
retries overwrite the same logical output and lets a later pipeline add a
master playlist and several renditions without changing product IDs.

## Limits

- No adaptive bitrate ladder, captions, DRM, CDN, or signed delivery yet.
- Before regeneration the worker clears only the current asset and pipeline
  version prefix. Retries therefore replace one deterministic logical output
  instead of accumulating partial segments; source uploads are never deleted.
- Worker concurrency is one and FFmpeg has explicit timeouts. Production must
  also apply container CPU/memory limits.
