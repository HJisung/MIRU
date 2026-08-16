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

The compatibility ID is currently exposed as `engagementTargetId` only where
the existing like/comment/save/report implementation still requires it. Product
reads and media traversal do not start from the compatibility aggregate.
