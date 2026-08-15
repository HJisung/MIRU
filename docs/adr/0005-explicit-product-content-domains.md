# ADR 0005: Explicit product content domains

- Status: Accepted
- Date: 2026-08-16

## Context

The first implementation used one Prisma `Post` model with `IMAGE`,
`SHORT_VIDEO`, and `LONG_VIDEO` formats. This was useful for proving upload,
feed, engagement, comments, and moderation, but the word Post now has a precise
product meaning: MIRU's community service. Home Single, Series, Shortform, and
Community Post have different publication policies and metadata.

## Decision

Model Home, Series, Shortform, and Community Post as explicit domain concepts.
Model public creator Collections separately from personal viewer Playlists.
Series supports `SINGLE_WORK` and `EPISODIC`, optional seasons, ordered episodes,
and reviewable creator submissions.

Migrate incrementally. Keep the existing universal publication aggregate only
as a compatibility layer while working vertical slices are moved to explicit
domain models. Do not rewrite the media lifecycle, object storage, generated
OpenAPI contract, authentication, or moderation infrastructure.

## Consequences

- Product language becomes visible in schema, APIs, routes, and tests.
- Domain publication rules can evolve without adding unrelated nullable fields
  to one table.
- Shared engagement requires an intentional target strategy as each slice is
  migrated.
- A temporary compatibility layer exists, so migration state must be documented
  and no new feature may deepen dependence on the legacy universal Post model.
