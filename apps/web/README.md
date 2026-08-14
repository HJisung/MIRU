# Web

Next.js App Router application for Stream.

## Feature map

- `src/app`: routes, metadata, global shell, and route-level states
- `src/features/feed`: discovery-feed presentation
- `src/components`: app-wide navigation and brand primitives
- `src/lib/api.ts`: typed HTTP boundary using `@stream/api-contract`
- `src/lib/format.ts`: display-only number/date/duration formatting
- `tests`: real browser flows with Playwright

Server components fetch public feed data. Interactive client components should be introduced only when a feature needs browser state or event handlers.

Run from the repository root with `pnpm dev`. The web app expects the API at `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:4000/api/v1`.
