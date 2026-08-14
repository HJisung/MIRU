# Stream Platform

Long-form video, short-form video, and image posts in one feed-oriented media platform.

This repository currently contains architecture, workspace conventions, and local infrastructure only. Application source code and package manifests are intentionally deferred until the stack decision is approved.

## Chosen baseline

- Monorepo: pnpm workspaces + Turborepo
- Web: Next.js 16 App Router, React, TypeScript
- API: NestJS 11 on Fastify, REST/OpenAPI first
- Media worker: NestJS standalone worker + BullMQ + FFmpeg/ffprobe
- Data: PostgreSQL 18 + Prisma ORM
- Cache/queue: Redis 8 + BullMQ
- Object storage: S3 API (MinIO locally, cloud object storage in production)
- Playback: HLS, with hls.js fallback where native HLS is unavailable
- UI: Tailwind CSS + shadcn/ui primitives, TanStack Query, React Hook Form, Zod
- Quality: Vitest, Testing Library, Playwright, ESLint, Prettier
- Observability: OpenTelemetry, structured logs, Prometheus/Grafana profile later

The rationale and alternatives are documented in [docs/architecture/stack.md](docs/architecture/stack.md).

## Repository map

```text
apps/
  web/             # Next.js user-facing web app
  api/             # NestJS HTTP API (modular monolith)
  media-worker/    # asynchronous probe/transcode/thumbnail jobs
packages/
  api-contract/    # generated OpenAPI client/types; no handwritten duplicates
  database/        # Prisma schema, migrations, seed boundary
  media/           # shared media domain types and presets
  observability/   # logging, tracing, metrics conventions
  ui/              # reusable design-system components
  config-*/        # shared lint/TypeScript/test configuration
infra/
  compose/         # local container configuration notes
  docker/          # future application Dockerfiles
  monitoring/      # future local observability configuration
docs/
  adr/             # architecture decision records
  architecture/    # system, stack, data, and media design
  product/         # scope and roadmap
  runbooks/         # operating procedures
```

## Local infrastructure

Copy `.env.example` to `.env`, then run:

```shell
docker compose up -d
docker compose ps
```

This starts PostgreSQL, Redis, and MinIO. MinIO console is available at `http://localhost:9001`. Credentials are local-development defaults and must never be reused outside a developer machine.

Stop containers without deleting data:

```shell
docker compose down
```

Deleting named volumes is intentionally not included because it destroys local data.

## Before application implementation

1. Confirm MVP scope in `docs/product/roadmap.md`.
2. Lock exact package versions and create the root workspace manifests.
3. Scaffold `apps/web`, `apps/api`, and `apps/media-worker` independently.
4. Define the first OpenAPI contract and Prisma schema before UI integration.
5. Add CI, tests, and application Dockerfiles alongside the first executable code.

