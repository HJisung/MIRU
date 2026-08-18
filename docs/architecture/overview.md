# System architecture

## Shape

Begin with three deployable applications: web, API, and media worker. The API remains a modular monolith. This avoids distributed-system overhead while giving the expensive media pipeline an independent scaling and failure boundary.

```text
Browser / mobile web
  |-- metadata, feed, auth ----------> API ------------> PostgreSQL
  |                                      | \-----------> Redis / BullMQ
  |-- presigned upload ----------------> Object storage       |
  |-- HLS/images via CDN <------------- Object storage <------ Media worker
```

Production adds a CDN and managed equivalents; the application talks through PostgreSQL, Redis, and S3-compatible interfaces so local Compose does not dictate the cloud vendor.

## Product domain modules

- home: ordinary Single videos and public Collections
- series: reviewed single-work and episodic works, submissions, seasons, episodes
- shortform: vertical video and image carousels
- community: community Posts and managed Categories
- library: personal Playlists, saves, and viewing history

These product modules share identity, media, engagement, moderation, and feed
capabilities without collapsing their publication models into one table.

## Platform capability modules

- identity: accounts, sessions, OAuth/passkeys, roles
- profiles: public profiles and settings
- social: follow, block, mute
- media: upload sessions, assets, renditions, lifecycle state
- legacy publications: isolated compatibility endpoints, residual-data audit,
  and export support; normal product flows do not depend on this boundary
- feed: bounded product-native candidate selection, deterministic mixed-type
  ordering, and cursor pagination
- engagement: likes, saves, shares, view events
- comments: threaded comments and moderation state
- moderation: reports, review decisions, safety state
- notifications: in-app notification generation and read state

Each module owns its tables and exposes application services/events. Cross-module joins may be used deliberately inside the monolith for read models, but writes must respect ownership.

## Media lifecycle

1. Client requests an upload session with declared file metadata.
2. API authorizes the request, allocates an opaque object key, and returns a short-lived presigned multipart upload.
3. Client uploads directly to the private source bucket.
4. Completion request verifies object existence/size and creates a durable processing job.
5. Worker probes the file, validates codecs/container, scans as required, and creates thumbnails/posters.
6. Video is transcoded into an HLS adaptive bitrate ladder; images are normalized into safe web renditions.
7. Worker atomically marks renditions ready. The owning product becomes
   publishable only after its required assets are ready.
8. Playback uses signed CDN access when content is private or access-controlled.

Jobs are idempotent by asset plus pipeline version. Originals, intermediate files, and derived renditions use distinct prefixes/buckets and lifecycle policies.

## Data roles

- PostgreSQL: source of truth for users, authoritative product records,
  relationships, asset metadata, moderation, and durable business state.
- Redis: rate limits, ephemeral caching, distributed coordination, and BullMQ jobs. Never the only store of business truth.
- Object storage: originals and derived media. Never store large binaries in PostgreSQL.
- Analytics store: deferred. Emit versioned events now; add ClickHouse or a managed warehouse only when volume and queries justify it.

## Scaling path

1. Scale web/API/worker replicas independently.
2. Separate worker queues by resource class: probe, image, video CPU, video GPU.
3. Add CDN and lifecycle rules; move to managed PostgreSQL/Redis/object storage.
4. Add read replicas/search/analytics based on measured bottlenecks.
5. Extract a domain service only when ownership, scaling, or release cadence clearly requires it.
