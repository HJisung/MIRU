# Stream Platform

Long-form video, short-form video, and image posts in one feed-oriented media platform.

The repository is now in active implementation. Architecture and local infrastructure are established; executable applications are being added as end-to-end vertical slices.

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

## Get started

Requirements: Node.js 24 LTS, Corepack/pnpm 11, and Docker Desktop.

```powershell
Copy-Item .env.example .env
corepack enable
pnpm install
docker compose up -d
pnpm db:migrate -- --name init
pnpm db:seed
pnpm dev
```

Open the web app at `http://localhost:3000`, the API at `http://localhost:4000/api/v1`, and OpenAPI JSON at `http://localhost:4000/api/openapi.json`.

Implemented flows include the public discovery feed, account sessions, profiles, direct image upload and publishing, likes/saves/follows/comments, a following feed, blocks/reports, and a role-protected moderation queue. The web app includes responsive discovery/detail pages plus registration/login and image publishing screens.

PostgreSQL, Redis, and MinIO run through Compose. MinIO stores private originals and the API issues short-lived direct-upload URLs. Credentials in `.env.example` are local-only defaults.

Stop containers without deleting data:

```shell
docker compose down
```

Deleting named volumes is intentionally not included because it destroys local data.

## Everyday commands

```shell
pnpm dev                 # web + API with dependency packages built first
pnpm build               # production builds through Turborepo
pnpm lint
pnpm typecheck
pnpm test                # unit + PostgreSQL integration tests
pnpm test:e2e            # Playwright visitor flow
pnpm contract:generate   # export OpenAPI and regenerate TypeScript types
pnpm db:seed             # reset deterministic local demo records
```

Start at [docs/product/implementation-plan.md](docs/product/implementation-plan.md) for the slice order. When learning the first flow, trace `apps/web/src/app/page.tsx` → `apps/web/src/lib/api.ts` → generated `packages/api-contract` types → `apps/api/src/feed` → `packages/database/prisma/schema.prisma`.
