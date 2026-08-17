# ADR 0006: Domain playback and engagement identities

## Status

Accepted

## Decision

Playback routes use product IDs: `/watch/home/:videoId`,
`/watch/series/:seriesId`, and `/watch/episode/:episodeId`. A published Home
video, single-work Series, or Series episode points directly to its ready
`MediaAsset`; it does not traverse `LegacyPublication` to discover playback.

Shared engagement is exposed as the typed pair `{ type, id }`, where `id` is
the product entity ID. `EngagementTargetService` validates visibility and
resolves that pair to the existing LegacyPublication-backed storage for likes,
saves, comments, and reports. Compatibility `/posts/:postId/*` endpoints remain
temporarily, but new clients use `/engagement/:targetType/:targetId/*`.

Community authoring creates its product row and compatibility publication in one
transaction. Community APIs and clients always return and use the Community Post
ID; the compatibility ID remains internal for TEXT, IMAGE, VIDEO, and LINK.

## Why

This keeps URLs and contracts readable without creating a universal playable
or giant content table. It also gives engagement one domain-aware boundary
without duplicating four sets of social tables. The resolver is deliberately
small and explicit so a later migration can move storage FKs away from
LegacyPublication without changing product-facing IDs.

## Consequences

- `SINGLE_WORK` owns `singleWorkAsset` and requires no fake episode.
- `EPISODIC` episodes own their playback asset independently.
- LegacyPublication still stores engagement rows/counters, discovery feed
  compatibility, moderation queue data, and the existing upload transaction.
- An episodic Series aggregate has no legacy engagement row; engagement is on
  its episodes until engagement storage is migrated to native targets.
