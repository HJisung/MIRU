# Technology decisions

## Recommended stack

| Area | Choice | Why |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Fast installs, explicit workspace boundaries, cached task graph |
| Web | Next.js 16 App Router + React + TypeScript | SEO/public pages, server rendering, routing, image handling, mature deployment options |
| UI | Tailwind CSS + shadcn/ui primitives | Product-specific UI without locking into a heavy component suite |
| Client data | TanStack Query | Cache, mutations, infinite feeds, cancellation, and retry control |
| Forms/validation | React Hook Form + Zod | Typed boundary validation and good form ergonomics |
| API | NestJS 11 + Fastify adapter | Strong module conventions, DI, OpenAPI, guards, queues, and a faster HTTP adapter |
| Contract | REST + OpenAPI | Easy CDN/cache semantics, generated clients, broad tooling; GraphQL is unnecessary initially |
| ORM | Prisma | Productive schema/migrations and strong TypeScript ergonomics; use SQL intentionally for feed queries |
| Primary DB | PostgreSQL 18 | Relational integrity, transactions, JSON/search options, mature operations |
| Cache/jobs | Redis 8 + BullMQ | Practical Node queue, delayed/retryable jobs, concurrency controls |
| Media | FFmpeg + ffprobe | Industry-standard probing, transcoding, thumbnails, HLS packaging |
| Storage | S3-compatible API | Direct multipart upload, lifecycle rules, CDN integration, vendor portability |
| Playback | HLS + hls.js | Adaptive playback across web clients; native HLS where supported |
| Auth | Better Auth or a managed OIDC provider | Avoid custom credential/session cryptography; decide build-vs-buy before implementation |
| Tests | Vitest + Testing Library + Playwright + Testcontainers | Fast unit tests plus realistic API/data and browser coverage |
| Observability | OpenTelemetry + Pino-compatible structured logging | Vendor-neutral traces/metrics and machine-readable logs |

## Deliberately deferred

- Native mobile apps: first prove the product with responsive/PWA web; add React Native/Expo only when needed.
- Kafka: Redis-backed jobs are enough for the MVP. Adopt a durable event backbone only after real fan-out/retention needs.
- Elasticsearch/OpenSearch: begin with PostgreSQL search; add dedicated search based on relevance and scale requirements.
- Kubernetes: Compose for local and a simple container platform for early production. Introduce orchestration complexity when operations demand it.
- ML ranking: begin with chronological and weighted heuristic feeds; collect privacy-aware signals before model infrastructure.
- WebRTC: not needed for uploaded-media playback; reconsider only for live streaming.

## Important caveats

- Redis 8 licensing must be reviewed for the intended distribution/hosting model. Valkey is the low-friction alternative if policy prefers permissive licensing.
- MinIO is a local S3-compatible development dependency, not a production architecture commitment.
- Prisma should not hide database behavior. Complex feed and analytics paths may use reviewed parameterized SQL with query plans and indexes.
- Exact npm/container versions should be locked during implementation and updated by an automated dependency process.

