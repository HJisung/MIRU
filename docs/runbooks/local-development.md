# Local infrastructure runbook

## Start

1. Copy `.env.example` to `.env` and keep the file uncommitted.
2. Run `docker compose config` to inspect the resolved configuration.
3. Run `docker compose up -d`.
4. Run `docker compose ps`; PostgreSQL, Redis, and MinIO should become healthy and `minio-init` should exit successfully.

## Endpoints

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO S3 API: `http://localhost:9000`
- MinIO console: `http://localhost:9001`

## Diagnose

- `docker compose logs postgres`
- `docker compose logs redis`
- `docker compose logs minio`
- Port collision: override the relevant `*_PORT` value in `.env`.
- Bucket missing: inspect `docker compose logs minio-init`, then rerun `docker compose up minio-init`.

## Data safety

`docker compose down` preserves named volumes. Adding `--volumes` deletes all local database, queue, and object-storage data and should only be done intentionally.

