# ADR 0004: Database-backed cookie sessions

## Status

Accepted for the MVP on 2026-08-15.

## Context

The web and NestJS Fastify API need first-party email/password authentication. Better Auth is attractive, but its documented NestJS integration is community-maintained and Fastify support is currently beta. Introducing that adapter would put a beta integration on every API request.

## Decision

Use an identity module in the NestJS modular monolith with Argon2id password hashes and random opaque sessions. The raw session token is sent only in a secure, HTTP-only, SameSite cookie; PostgreSQL stores only its SHA-256 digest. Sessions expire after seven days and can be revoked server-side.

Use a generic login error to reduce account enumeration. OAuth/OIDC remains a future addition behind the identity module boundary.

## Consequences

- Authentication has no beta framework adapter in the request path.
- We own session lifecycle, cleanup, rate limiting, verification, and recovery flows.
- Before public launch, add email verification, password reset, session management, auth rate limits, and production CSRF/origin enforcement.
- Re-evaluate Better Auth or a managed OIDC provider when adding social login or passkeys.
