# ADR 0003: Runtime and framework baseline for implementation

- Status: Accepted
- Date: 2026-08-15

## Context

The architecture documents named major technologies but did not lock an implementation baseline. A reproducible baseline matters for a learner-oriented repository because unexplained version drift makes examples, generated code, and troubleshooting inconsistent.

## Decision

- Use Node.js 24 LTS and pnpm 11 through Corepack.
- Start the web application on Next.js 16.3 and React 19 with the App Router and Turbopack defaults.
- Start the API on NestJS 11.2 with Fastify 5.
- Use Prisma ORM 7 with ESM and the required PostgreSQL driver adapter.
- Use Tailwind CSS 4 and add shadcn/ui components only when a product screen needs them.
- Keep exact resolved dependency versions in the lockfile and avoid unpinned CLI execution in automation.

The versions above are compatibility baselines, not a promise to stay on a specific patch forever. Dependency updates should be small, tested changes.

## Why these choices

Node.js 24 is an LTS line supported by Prisma 7, while Next.js 16 and NestJS 11 require Node.js 20 or newer. One runtime across applications reduces setup and debugging cost. Prisma 7 remains useful for readable migrations and typed access, but its mandatory driver adapter must be visible in the database package rather than hidden behind framework magic.

Tailwind and shadcn/ui are intentionally separated: Tailwind provides the styling vocabulary; shadcn/ui source is added selectively so the repository does not begin with a large unused component catalog.

## Consequences

- Contributors need Node.js 24 and Corepack.
- The repository uses ESM consistently.
- Linting is an explicit quality gate because Next.js 16 no longer runs lint as part of `next build`.
- Framework-generated samples must be replaced by product code in the same slice that introduces them.

