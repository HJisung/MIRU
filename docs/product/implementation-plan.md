# Vertical-slice implementation plan

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
