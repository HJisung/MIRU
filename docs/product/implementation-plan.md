# MIRU domain migration and vertical-slice plan

The product terms in [domain-model.md](domain-model.md) are authoritative. The
original universal Prisma `Post` is a compatibility aggregate, not the future
meaning of product Post.

## Phase A: product alignment

Status: implemented for the repository source of truth.

- Record the gap between the working repository and current product language
- Establish Home, Collection, Series, Shortform, Community Post, Category, and
  Playlist as explicit boundaries
- Keep the existing stack and media lifecycle decisions

## Phase B: relational migration

Status: product-native foundation implemented. Physical LegacyPublication
removal is deferred until residual data receives its final retention/export
decision.

- Add explicit domain records and migrate deterministic demo data
- Expand Series to work type, publication/review state, optional Season, and
  Episode
- Keep Collection and personal Playlist structurally and legally separate
- Preserve nullable legacy publication identifiers only for historical
  compatibility resolution

## Phase C: API contracts

Status: Home Single, Collection, Series, Shortform, and Community Post public
read contracts are implemented and generated into the web contract package.

- Introduce `/home`, `/series`, `/shortforms`, and `/community-posts` contracts
- Generate TypeScript types from OpenAPI
- Keep compatibility endpoints only while an implemented flow still uses them

## Phase D: web information architecture

Status: primary navigation and independent experiences for all four services
implemented at the MVP read baseline.

- Primary navigation: Home, Series, Shortform, Post
- Home never presents Series as a subtype of ordinary video
- Give Series a work-oriented browse and detail experience

## Phase E: completed slices

Complete one slice at a time through UI, API, database, generated contract, and
tests. Order: Home Single, Collection, Series browse/detail and review
foundation, then Shortform and Community Post migration.

- Home Single list/detail: complete
- Collection public list foundation: complete
- Series browse/detail and approval-capable data foundation: complete
- Shortform explicit API, ordered carousel media, promotion CTA, and immersive
  web feed: complete
- Community Post Home, managed Category filtering, detail, image publishing,
  and timeline: complete
- Series single-work playback, explicit Home/Series/Episode playback identity,
  and domain-aware engagement API boundary: complete
- Creator Studio Series drafts, stable submission/review history,
  administrator decisions, and explicit work-type-aware publication: complete
- Creator Studio EPISODIC Season and Episode management, atomic global
  ordering, metadata correction, and safe Episode publish/unpublish: complete
- Community Post TEXT/IMAGE/VIDEO/LINK authoring, author-scoped retry identity,
  shared adaptive video attachment, edit/archive management, and public
  type-aware rendering: complete
- Native product-identity engagement persistence, EPISODIC Series aggregate
  engagement, compatibility bridging, and audited operational moderation:
  complete
- Product-native discovery/following feeds, typed personal Playlists, normal
  product-write decoupling from LegacyPublication, and residual-data audit:
  complete

## LegacyPublication migration status

Normal product services no longer create, publish, edit, archive, remove, feed,
play, engage with, or moderate content through the compatibility aggregate.
Nullable historical publication identifiers remain only to resolve old mapped
URLs. The aggregate remains for:

- explicitly legacy `/posts` read/create and engagement adapters
- genuinely unmapped legacy interactions and media retained as residual data
- historical mapped URL resolution
- unsupported or unmapped historical Playlist items retained with reasons
- read-only audit/export tooling and migration fixtures

Mapped compatibility endpoints resolve to native targets and never dual-write.
Mapped legacy detail cannot bypass native product visibility; unmapped legacy
detail remains within the compatibility boundary. Migrations reject ambiguous
required mappings, preserve residual rows, and never infer a product with an
arbitrary first match. No normal product read or write queries the compatibility
table.

The remaining physical `Post`, PostMedia, PostLike, PostSave, Comment, Report,
and residual Playlist rows require a separately approved retention/export and
final-drop slice. Their existence does not make LegacyPublication authoritative.

## Existing implementation history

Each slice ends with working UI, API/data behavior, relevant tests, and updated documentation. The order prioritizes visible product progress and establishes difficult boundaries before adding social breadth.

## Slice 1: Explore and understand the system

Status: implemented and verified locally.

- Reproducible pnpm/Turborepo workspace and one-command local dependencies
- PostgreSQL schema and demo seed for users, ready media, and published posts
- NestJS health, discovery feed, and post detail endpoints with OpenAPI
- Generated TypeScript client consumed by Next.js
- Responsive discovery feed and post detail screen using local demo media
- Unit tests for cursor rules, API integration tests against PostgreSQL, and a Playwright explore flow

This slice is intentionally read-only. It lets a contributor trace browser component → generated API client → Nest use case → Prisma query → PostgreSQL row without authentication obscuring the path.

## Slice 2: Accounts and profiles

Status: implemented at MVP baseline.

- Select and integrate the authentication library/provider with an ADR
- Session-aware web shell, registration/login/logout, profile editing
- Authorization helpers tested at module boundaries

## Slice 3: Image upload and publishing

Status: implemented for the synchronous image MVP path. Normalized renditions and the asynchronous image-worker/outbox handoff remain pending.

- Presigned direct upload, verified completion, image worker, safe renditions
- Draft and publish state machine with idempotent queue handoff
- Creator upload UI with recoverable progress and errors

## Slice 4: Short and long video

Status: shared source-bounded adaptive pipeline implemented for Home, Series
SINGLE_WORK, Series Episode, and Shortform VIDEO.

- Direct video upload, real ffprobe validation, poster and 360p/720p/1080p
  source-bounded adaptive HLS
- Resource-bounded FFmpeg worker with deterministic job/output identity and retries
- Accessible HLS player for processed Home Singles
- Bounded recoverable processing polling, deterministic derived cleanup, and a
  real API → MinIO → BullMQ → worker → FFmpeg → HLS integration test
- Recoverable product workflow checkpoints prevent duplicate drafts after a
  create response succeeds but a later publish or navigation step fails
- Database-enforced exclusive playback claims and ADMIN queue diagnostics/retry

## Slice 5: Social and engagement

Status: API baseline implemented.

- Follow, like, save, and top-level comments
- Following feed and optimistic UI with server reconciliation

## Slice 6: Moderation baseline

Status: operational MVP implemented.

- Typed product reports, bounded moderator queue/detail, review and dismissal
- Product-aware removal, republish/media denial, and append-only audit
- Responsive ADMIN/MODERATOR web workflow with destructive confirmation

## Definition of done for every slice

- A real user flow works from a clean clone using documented commands.
- Format, lint, typecheck, unit/integration tests, build, and relevant E2E pass.
- Failure and authorization paths are tested, not only the happy path.
- No secrets, generated drift, unused abstraction, or unexplained architectural change.
- README, OpenAPI, schema notes, and ADRs match the implementation.
