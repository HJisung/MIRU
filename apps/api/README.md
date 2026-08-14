# API

NestJS/Fastify modular-monolith API for Stream.

## Feature map

- `src/health`: liveness and PostgreSQL readiness
- `src/feed`: public discovery query, cursor codec, response mapping
- `src/posts`: public post detail use case
- `src/database`: Nest lifecycle boundary around `@stream/database`
- `src/openapi`: one OpenAPI document used at runtime and for generated clients

Controllers translate HTTP input/output. Services represent the small use cases. Prisma records are mapped to deliberate response DTOs instead of being returned directly.

Run from the repository root with `pnpm dev`, or run only this app with `pnpm --filter @stream/api dev` after building `@stream/database`.

Tests under `src` are focused units. Tests under `test` start the real Nest application and query Docker PostgreSQL through Fastify injection.
