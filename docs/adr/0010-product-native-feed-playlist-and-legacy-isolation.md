# ADR 0010: Product-native feed, Playlist identity, and legacy isolation

## Status

Accepted

## Context

ADR 0006 moved playback, engagement, and moderation to product identities but
left discovery, personal Playlist storage, and normal product lifecycle writes
dependent on the original Prisma `Post` aggregate. That aggregate is named
LegacyPublication in architecture language and must not remain between an
authoritative product and its feed, media, engagement, moderation, or library
behavior.

Historical Post rows and unmapped interactions still require preservation. A
safe transition therefore cannot equate product decoupling with immediately
dropping the table.

## Decision

Discovery and following query authoritative HomeVideo, playable single-work
Series, SeriesEpisode, and ShortForm records directly. Community Post remains
in its dedicated Post Home rather than being added to the mixed discovery feed.
Candidate queries are bounded per type, hydrate creator, authoritative media,
and EngagementTarget counters, then merge under the total order:

`publishedAt DESC, typeRank DESC, productId DESC`

The versioned cursor encodes all three values. Native product publication state,
ready media, and ACTIVE moderation state determine visibility. Legacy Post
status, counters, media, author, and ID are not feed inputs.

Personal Playlist items use a typed identity with exactly one relational
product foreign key. Supported targets are Home video, playable single-work
Series, Series Episode, video Shortform, and video Community Post. Playlist is
viewer organization and remains distinct from public creator Collection.
Unavailable or moderated products retain their item but render without a
playback link. Historical unmapped or unsupported publication-backed items are
preserved in an explicit residual table with a reason.

Normal Home, Series, Episode, Shortform, and Community Post creation and
lifecycle transitions operate only on authoritative product rows, their media
relations, MediaPlaybackClaim, and EngagementTarget. They do not create or
synchronize a compatibility Post. Historical `publicationId` relations are
nullable and exist only for old-ID resolution while compatibility data remains.

Legacy `/posts` endpoints are an explicit adapter boundary:

- mapped historical identifiers resolve to the native product/target and must
  obey native visibility;
- genuinely unmapped rows may use residual Post interaction and media tables;
- explicit legacy creation may create compatibility data, but no current
  product client depends on it;
- a read-only residual audit/export path reports what remains before any final
  deletion is considered.

EngagementTarget remains narrowly scoped to engagement and moderation. It is
not used as feed content storage or Playlist storage, and no universal Content
or Publication replacement is introduced.

## Consequences

- Feed and Playlist public identities are typed product IDs; publicationId is
  absent from their API contracts and web state.
- Mixed pagination remains deterministic across equal timestamps and product
  tables without a persistent universal feed projection.
- Feed work is a fixed number of bounded product queries, not a query per card.
- Product media comes from HomeVideo, Series, SeriesEpisode, ShortFormMedia, or
  CommunityPostMedia; new product writes do not duplicate it into PostMedia.
- Moderator removal, republish prevention, engagement, and HLS authorization
  continue to work for native-only products with no compatibility row.
- Legacy tables remain physically present until a later retention/export/drop
  decision. Their remaining consumers must be labeled compatibility,
  residual-data, migration, seed compatibility fixture, or documented
  transitional exception.
- ADR 0006 remains valid for playback and native engagement identity. This ADR
  supersedes its statements that normal Community authoring creates a
  compatibility publication and that removal synchronizes compatibility
  projections.
