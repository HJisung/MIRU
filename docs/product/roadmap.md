# Product roadmap

Implementation proceeds as end-to-end slices described in [implementation-plan.md](implementation-plan.md). This roadmap describes product scope; it is not a promise to build all infrastructure before any flow is usable.

## Product foundation (current)

- Align schema, API, routes, tests, and documentation to Home, Series,
  Shortform, and Community Post
- Preserve authentication, direct upload, media lifecycle, social actions, and
  moderation while removing product dependence on the universal Post model
- Complete Home Single list/detail as the reference vertical slice
- Add Collection foundations and a Series browse/detail foundation with review
  states
- Complete explicit Shortform and Community Post read slices, including ordered
  carousel media and Category-backed Post navigation
- Provide a Creator Studio Series workflow from creator draft and review through
  administrator decision, media readiness, and explicit publication
- Operate approved EPISODIC Series through optional Seasons, multiple Episode
  drafts, atomic ordering, and individual publication controls
- Author and manage Community TEXT, IMAGE, VIDEO, and LINK Posts with active
  Categories, retry safety, shared HLS playback, and archive semantics

## MVP

- Account and profile
- Direct multipart upload for images and video
- Processing status and failure recovery
- Home Single video, Collection, reviewed Series works, Shortform, and Community Post
- Following feed and discovery feed with cursor pagination
- Playback, likes, saves, follows, and top-level comments
- Basic report/block flows and admin moderation queue
- Accessibility, responsive layouts, and core web performance budgets

## Next

- Add media lifecycle retention, stale-v1 reprocessing tools, and dead-letter
  administration around the adaptive HLS pipeline
- Move engagement persistence behind the now domain-aware target API from
  compatibility publication foreign keys to native target storage
- Add richer Series artwork/analytics and Community media-replacement tools
- Nested comments, notifications, richer creator tools
- Search, hashtags/topics, captions/subtitles
- Resumable upload UX and creator analytics
- Content visibility options and signed delivery
- Automated moderation integrations after policy is defined

## Later

- Native mobile clients
- Live streaming
- Personalized ML ranking
- Monetization, ads, subscriptions, and rights management

## Explicit non-goals for the first release

- Recreating every YouTube/Instagram/TikTok feature
- Microservices per domain
- Multi-region active-active writes
- Custom video codec or custom recommendation model
- WebRTC, OBS ingest, live HLS, or large-scale realtime chat
