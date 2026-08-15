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

Status: domain foundation implemented; legacy publication removal is deferred
until all dependent slices have moved.

- Add explicit domain records and migrate deterministic demo data
- Expand Series to work type, publication/review state, optional Season, and
  Episode
- Keep Collection and personal Playlist structurally and legally separate
- Preserve legacy publication identifiers while dependent flows are migrated

## Phase C: API contracts

Status: Home Single, Collection, and Series public reads implemented. Explicit
Shortform and Community Post contracts remain next.

- Introduce `/home`, `/series`, `/shortforms`, and `/community-posts` contracts
- Generate TypeScript types from OpenAPI
- Keep compatibility endpoints only while an implemented flow still uses them

## Phase D: web information architecture

Status: primary navigation and independent Home/Series screens implemented.

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
- Shortform and Community Post explicit API migration: pending

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

- Probe/validation, poster and thumbnail generation, HLS ladder
- Resource-bounded FFmpeg worker, retries, dead-letter visibility
- Accessible player and short-form viewing interaction

## Slice 5: Social and engagement

Status: API baseline implemented.

- Follow, like, save, and top-level comments
- Following feed and optimistic UI with server reconciliation

## Slice 6: Moderation baseline

Status: API baseline implemented. The admin web surface and append-only audit records remain pending.

- Report and block flows, moderation state, admin review surface, audit records

## Definition of done for every slice

- A real user flow works from a clean clone using documented commands.
- Format, lint, typecheck, unit/integration tests, build, and relevant E2E pass.
- Failure and authorization paths are tested, not only the happy path.
- No secrets, generated drift, unused abstraction, or unexplained architectural change.
- README, OpenAPI, schema notes, and ADRs match the implementation.
