# ADR 0006: Domain playback and engagement identities

## Status

Accepted

## Decision

Playback routes use product IDs: `/watch/home/:videoId`,
`/watch/series/:seriesId`, and `/watch/episode/:episodeId`. A published Home
video, single-work Series, or Series episode points directly to its ready
`MediaAsset`; it does not traverse `LegacyPublication` to discover playback.

Shared engagement is exposed as the typed pair `{ type, id }`, where `id` is
the product entity ID. `EngagementTarget` is a narrow persistence identity for
likes, saves, comments, reports, counters, and moderation state. It has exactly
one product foreign key and is not a universal content or CMS model.
`EngagementTargetService` validates product visibility before native access.
An episodic Series aggregate has its own target, separate from each Episode.

Compatibility `/posts/:postId/*` endpoints remain temporarily. A mapped ID
resolves to the same native target and never dual-writes; genuinely unmapped
legacy publications continue to use residual legacy rows. Migration retains
those rows, aborts ambiguous cross-product mappings, and recomputes counters
from interaction rows rather than stale display counters.

Community authoring creates its product row and compatibility publication in one
transaction. Community APIs and clients always return and use the Community Post
ID; the compatibility ID remains internal for TEXT, IMAGE, VIDEO, and LINK.

## Why

This keeps URLs and contracts readable without creating a universal playable
or giant content table. One target table supplies referential integrity for
shared storage while product services remain authoritative for metadata,
publication, and playback.

## Consequences

- `SINGLE_WORK` owns `singleWorkAsset` and requires no fake episode.
- `EPISODIC` episodes own their playback asset independently.
- Native counters are authoritative for product APIs. Legacy counters remain
  only for unmapped residual compatibility reads.
- Native reports, durable target restriction state, and append-only moderation
  audit records support operational review.
- Removal atomically updates the authoritative product and compatibility
  projection, retains media and claims, blocks republishing, and denies derived
  media. Creator publish and moderator removal serialize on the target row.
- LegacyPublication remains for discovery compatibility and unmapped legacy
  interactions until those consumers receive an explicit retirement policy.
