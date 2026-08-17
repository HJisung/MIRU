# MIRU product domain

This document is the product-language source of truth. Architecture, database
models, API names, routes, and UI copy should use these terms consistently.

## Primary services

MIRU has four primary content services:

1. **Home** — ordinary, self-contained videos (`Single`) and public creator
   groupings of those videos (`Collection`).
2. **Series** — reviewed works such as films, documentaries, animation, and
   episodic productions. Series is independent from Home.
3. **Shortform** — vertical video or an image carousel of up to ten images.
4. **Post** — an X/Reddit-like community service for text, image, video, and
   link posts, optionally scoped to a managed category.

Following, library, profile, and search are supporting experiences rather than
peer content services.

## Home

### Single

A Single is MIRU's default video. It is complete in one video and can be
published by an ordinary member without Series review. It owns video metadata,
publication state, and engagement. A Single is never an episode merely because
it appears in a Collection.

### Collection

A Collection is a public, ordered set of existing Singles. It does not copy
media and does not imply seasons, episode numbering, or narrative continuity.
The owner controls its title, description, cover, visibility, and ordering.

### Personal playlist

A Playlist is a private-by-default viewer library. It is owned by the viewer,
may contain supported playable content, and is not a creator publication.
Collection and Playlist therefore use separate models and authorization rules.

## Series

Series is a curated work with one of two work types:

- `SINGLE_WORK`: one complete work, such as a film or standalone documentary.
- `EPISODIC`: multiple episodes, optionally grouped into seasons.

Season is optional. An episodic work can attach episodes directly to the Series
until season grouping is useful. Series publication requires either an approved
creator submission or an administrator-created record. Review decisions retain
the reviewer, reason, and timestamp; administrative changes belong in the audit
log.

Series metadata may include synopsis, poster, backdrop, genres, tags, age
rating, production information, release date, and publication status. The old
`HIGH` proposal is retired and must not be represented as a content type,
quality grade, or review type.

Creator Series follow an explicit lifecycle. Draft metadata may be edited until
submission. `SUBMITTED` review locks metadata; withdrawal returns the work to a
draft, and rejection retains the decision reason before a new review attempt is
created. Approval is durable review evidence and grants access to Series media
management, but does not publish the work. Administrator-owned Series may use
the explicit publication path without a creator submission.

Publication readiness is work-type specific. `SINGLE_WORK` requires a READY
direct playback asset. `EPISODIC` requires at least one READY episode draft;
the public Series shell is created first and individual episodes are then
published explicitly. Draft Series and draft episodes remain unavailable from
public reads.

A `SINGLE_WORK` has a direct playable media asset and zero episodes. An
`EPISODIC` work has no single-work playable; each published Episode has its own
playable media asset. Product playback URLs always use Series or Episode IDs.

Approved `EPISODIC` works are operated through Creator Studio. Seasons are
optional and may be created, renamed, renumbered, or removed while empty.
Removing a Season never removes Episodes; a non-empty Season must first be
emptied by moving or unassigning its Episodes. `episodeNumber` is the canonical
positive order across the complete Series. A non-null `seasonEpisodeNumber` is
the positive, unique order within one Season and is cleared when an Episode is
unassigned.

Episode metadata and Season assignment may be corrected after publication
without replacing media. Reordering is an atomic Series-wide operation and
must include every Episode exactly once. Publishing an Episode requires a
published parent Series and READY media. Unpublishing preserves the Episode,
MediaAsset, and playback claim while making its public read and playback
unavailable. A published episodic Series must retain at least one published
Episode, so the last public Episode cannot be unpublished. Video replacement
remains out of scope until playback-claim release/reclaim semantics are
designed.

## Shortform

Shortform supports `VIDEO` and `IMAGE_CAROUSEL`. A carousel contains one to ten
ordered images through `ShortFormMedia`. A Shortform may point to a Home Single,
Series work, or Series episode as its internal call to action. For the MVP,
`musicKey` is an optional external catalog reference rather than a local Music
entity; a dedicated catalog is deferred until ownership and reuse requirements
exist.

## Community Post

Post means a community publication, not a universal media row. A Post can hold
text, images, video, or a link and supports likes, comments, reposts, sharing,
saving, and reporting. `categoryId = null` means the general Post Home feed;
otherwise it belongs to a service-managed Category.

Community media is ordered through `CommunityPostMedia`. Category records are
the source of truth for navigation. Omitting the category filter means Post Home
and returns only records whose `categoryId` is null.

Members author four explicit MVP types: `TEXT` requires meaningful plain text;
`IMAGE` requires one owned READY `POST_IMAGE`; `VIDEO` requires one owned READY
`POST_VIDEO`; and `LINK` requires an `http` or `https` URL. LINK authoring stores
the submitted URL without fetching or unfurling it. Body text is plain text with
line breaks preserved. Active managed Categories are validated inside every
create or move transaction.

Each browser creation carries an author-scoped UUID. The database unique key on
`(authorId, creationId)` makes ambiguous and concurrent retries resolve to one
Community Post without making identical text globally unique. Community VIDEO
uses the shared adaptive HLS pipeline and a `COMMUNITY_POST_VIDEO`
`MediaPlaybackClaim`; the claim, compatibility publication, product row, and
media links are created atomically.

Authors may edit body, Category, and LINK URL without changing type or replacing
media. Archive clears product and compatibility publication timestamps and
states in one transaction while preserving rows, engagement, media, and playback
claims. Archived product reads and derived media are unavailable. Media
replacement and LINK previews remain deliberately out of scope.

## Shared capabilities

Like, comment, save, share, follow, report, not-interested feedback, and viewing
history are shared capabilities, not proof that every domain belongs in one
large content table. Shared implementation may use small target references or
domain services, while publication rules and domain metadata stay owned by
their service.

## Naming during migration

The original Prisma `Post` model is a legacy universal publication aggregate.
New product code must not use the word Post for that aggregate. During the
incremental migration it is called `LegacyPublication` in documentation. It is
retained temporarily so authentication, upload, feed, engagement, comments,
and moderation remain operational while each product service receives an
explicit model and API. The migration is complete only when `Post` unambiguously
means Community Post in product-facing code.

Product contracts expose engagement as a typed product reference, never a
compatibility publication ID. The resolver currently maps that reference to
legacy like/comment/save/report storage internally. Product reads and media
traversal do not start from the compatibility aggregate.

Community Post is authoritative for product fields. Its legacy publication is
updated in the same transaction as creation, metadata edits, and archive solely
as a temporary engagement/feed/moderation projection; its identifier and
compatibility format are not exposed by Community APIs.
