# Local infrastructure runbook

## Start

1. Install Node.js 24 LTS and enable Corepack.
2. Copy `.env.example` to `.env` and keep the file uncommitted.
3. Run `pnpm install`.
4. Run `docker compose config` to inspect the resolved configuration.
5. Run `docker compose up -d postgres` for the discovery slice, or `docker compose up -d` for all prepared dependencies.
6. Run `pnpm db:migrate -- --name init`, then `pnpm db:seed`.
7. Run `pnpm dev` and open `http://localhost:3000`.

## Endpoints

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO S3 API: `http://localhost:9000`
- MinIO console: `http://localhost:9001`
- Web application: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`

## Generated API contract

The API owns the OpenAPI document. After changing controllers or DTOs, run `pnpm contract:generate`, commit `packages/api-contract/openapi.json` and `packages/api-contract/src/schema.d.ts`, then run typecheck. The web app imports aliases from `@stream/api-contract` rather than copying response interfaces.

## Quality checks

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. With PostgreSQL running and seeded, run `pnpm test:e2e` for the real browser flow.

## Diagnose

- `docker compose logs postgres`
- `docker compose logs redis`
- `docker compose logs minio`
- Port collision: override the relevant `*_PORT` value in `.env`.
- Bucket missing: inspect `docker compose logs minio-init`, then rerun `docker compose up minio-init`.

## Data safety

`docker compose down` preserves named volumes. Adding `--volumes` deletes all local database, queue, and object-storage data and should only be done intentionally.
