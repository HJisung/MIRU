# ADR 0002: Direct object upload and HLS delivery

- Status: Accepted
- Date: 2026-08-15

## Context

Large uploads would consume API bandwidth and memory. Source files are unsuitable for consistent adaptive playback.

## Decision

Upload directly to private S3-compatible storage using short-lived presigned multipart URLs. Process asynchronously into versioned thumbnails/images and an adaptive HLS ladder. Deliver derived assets through a CDN in production.

## Consequences

- API instances stay small and horizontally scalable.
- Upload completion, retries, orphan cleanup, and idempotency become first-class workflows.
- Storage CORS, signed delivery, and media lifecycle policies must be configured carefully.

