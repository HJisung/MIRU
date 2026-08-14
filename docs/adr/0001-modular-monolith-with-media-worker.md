# ADR 0001: Modular monolith with a separate media worker

- Status: Accepted
- Date: 2026-08-15

## Context

The product has many social domains, but early requirements will change rapidly. Media processing is CPU-heavy, retryable, and operationally different from HTTP request handling.

## Decision

Use one modular NestJS API deployable for business domains and one independently deployable media worker consuming jobs. Keep module ownership strict so high-value boundaries can be extracted later.

## Consequences

- Faster transactions, refactoring, tests, and local development than premature microservices.
- Worker failures and scaling are isolated from API traffic.
- Module boundaries require review discipline because the database is shared.
- Extraction remains an option, not an upfront cost.

