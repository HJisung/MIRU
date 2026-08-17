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

- Expand the shared single-rendition pipeline into an ABR ladder
- Move engagement persistence behind the now domain-aware target API from
  compatibility publication foreign keys to native target storage
- Add Community TEXT/VIDEO/LINK authoring and richer Series creator review UI
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
