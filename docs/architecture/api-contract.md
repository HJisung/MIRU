# API contract conventions

## Shape

- Base path: `/api/v1`
- JSON field names: camelCase
- Identifiers and timestamps are strings; timestamps use RFC 3339 UTC
- OpenAPI is emitted by the API and used to generate the web client
- Generated code lives in `packages/api-contract/generated` and is never edited manually

## Errors

Errors use one stable envelope so UI handling is predictable:

```json
{
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "The post does not exist or is not visible.",
    "requestId": "...",
    "details": {}
  }
}
```

`code` is stable and machine-readable. `message` is safe for developers but is not assumed to be final localized UI copy. Validation details identify fields without echoing secrets or large user input.

## Product-domain reads

### `GET /api/v1/home/videos`

Returns published Home Singles only. Series episodes are intentionally excluded.

### `GET /api/v1/home/videos/{videoId}`

Returns one published Home Single with its compatibility publication read model
for media and engagement counts.

### `GET /api/v1/home/collections`

Returns public Collections with ordered references to existing Home Singles.

### `GET /api/v1/series` and `GET /api/v1/series/{seriesId}`

Return published reviewed works and their ordered episodes. Series remains a
separate browse surface from Home.

## Public and compatibility reads

### `GET /api/v1/health/live`

Returns process liveness without checking external dependencies.

### `GET /api/v1/health/ready`

Returns readiness and verifies PostgreSQL connectivity.

### `GET /api/v1/feed/discovery?cursor=&limit=&type=`

Returns published native Home Video, SINGLE_WORK Series, Series Episode, and
Shortform records. Every card identity is the canonical `{type, id}` product
identity; legacy publication IDs are never returned. The opaque cursor encodes
the stable `(publishedAt, type rank, product id)` boundary. The initial maximum
page size is 24. `GET /api/v1/feed/following` uses the same contract and requires
an authenticated session.

### `/api/v1/playlists`

Authenticated viewers can create and manage private-by-default Playlists and
add supported playable products by `{type, id}`. Item reorder is an atomic full
order replacement. `PUBLIC` Playlists are browsable, `UNLISTED` Playlists are
available by direct ID, and `PRIVATE` Playlists are owner-only. Unavailable
products remain as tombstones without a playback link. The generated OpenAPI
document is authoritative for the create, update, delete, item, and manage route
shapes.

### `GET /api/v1/posts/{postId}`

Returns a visible published post with its display-ready media and author summary. Missing and non-visible posts intentionally share the same public response.

## Later authenticated endpoints

Authentication, upload sessions, publish, engagement, follow, comment, and report endpoints are added in the vertical slice that implements each behavior. Do not publish speculative OpenAPI operations that have no tested implementation.

## Compatibility

Additive response fields are allowed within v1. Removing or changing meaning requires a migration path. Internal database models are never returned directly; API response models are deliberate read models.
