# Codex project instructions

## Mission

Build a production-minded media platform for long video, short video, and image posts. Preserve a fast MVP path while keeping media processing and feed concerns separable.

## Current phase

The repository is in active implementation. Build the product in small, coherent vertical slices that connect UI, API, data, tests, and documentation. Avoid creating unused infrastructure or placeholder abstractions ahead of a real user flow.

## Read first

Before changing architecture or code, read:

1. `docs/architecture/overview.md`
2. `docs/architecture/stack.md`
3. Relevant ADRs in `docs/adr/`
4. `docs/product/roadmap.md`

## Architectural rules

- Keep `apps/api` a modular monolith initially. Modules own their domain logic and persistence access.
- Keep CPU-intensive or retryable media work in `apps/media-worker`, never in an HTTP request lifecycle.
- Clients upload directly to object storage through short-lived presigned URLs. Do not proxy large media through the API.
- Store media binaries in object storage, metadata in PostgreSQL, and ephemeral state/jobs in Redis.
- Serve derived HLS renditions and images through a CDN in production.
- Use REST + OpenAPI as the external contract. Generate clients/types; do not hand-copy API types.
- Use an outbox/idempotency strategy for database-to-queue workflows that must not lose events.
- Never expose original private object keys or trust client-provided MIME type, duration, or dimensions.
- Start feed ranking with explainable rules and cursor pagination. Do not introduce ML infrastructure prematurely.

## Repository conventions

- Applications live in `apps/`; reusable packages live in `packages/`; deploy/runtime assets live in `infra/`.
- Prefer feature/domain folders over technical-layer-wide folders.
- Keep dependencies directed inward: transport -> application -> domain; infrastructure implements ports.
- Avoid cross-domain database access. Expose module services or events instead.
- Keep environment variables documented in `.env.example`; never commit secrets or `.env`.
- Pin container and package versions before production deployment. Avoid `latest` tags.
- Add or update an ADR when changing a foundational technology or boundary.

## Quality gates once code exists

- Run formatting, lint, typecheck, unit tests, integration tests, and relevant Playwright tests.
- Test upload authorization, object-key isolation, idempotent jobs, retry/dead-letter behavior, and authorization boundaries.
- Verify Compose configuration with `docker compose config` after changing it.
- Keep logs structured and exclude tokens, cookies, credentials, and sensitive media URLs.

## Change discipline

- Make the smallest coherent change.
- Preserve user changes and unrelated worktree edits.
- Update docs in the same change when behavior, contracts, architecture, or operations change.
- State assumptions when product behavior is not decided; record durable decisions as ADRs.
