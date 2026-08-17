# ADR 0008: Source-bounded adaptive HLS and minimal media operations

- Status: Accepted
- Date: 2026-08-18

## Decision

Video pipeline version 2 creates a source-bounded H.264/AAC ladder from the
central policy in `@stream/media`: 360p at 800 Kbps, 720p at 2.8 Mbps, and
1080p at 5 Mbps. Profiles above the source height or configured maximum are
omitted. Sources below 360p receive one even-dimension source-height variant,
so processing never upscales solely to fill the nominal ladder.

One FFmpeg invocation splits the decoded video into all selected variants and
uses common six-second forced keyframes, disabled scene-cut keyframes, and
independent HLS segments. It writes `master.m3u8`, one variant playlist per
rendition, aligned MPEG-TS segments, and a shared poster. READY is committed
only after every generated artifact has uploaded successfully.

Pipeline v2 uses `derived/{assetId}/v2`. Existing v1 READY assets keep their
stored playback URL and are not reprocessed at application startup. New
uploads use v2; an operator may explicitly retry a FAILED asset without
allocating a new MediaAsset or product.

`MediaPlaybackClaim.assetId` is a database primary key created in the same
transaction as a Home, Series, Episode, or video Shortform attachment. This
closes the application-check race while retaining idempotent existing-record
retries.

Authenticated ADMIN endpoints expose bounded BullMQ counts and safe processing
diagnostics/retry. They never expose source object keys or credentials.

## Resource controls

Local defaults are one worker job, two FFmpeg threads, a 30-minute FFmpeg
timeout, and a maximum 1080p rendition. Environment variables may lower or
raise these deliberate limits without duplicating policy across services.

## Limits

The MVP uses H.264/AAC MPEG-TS HLS only. It does not provide 4K, alternative
codecs, subtitles, DRM, CDN delivery, manual quality selection, or distributed
transcode scheduling.
