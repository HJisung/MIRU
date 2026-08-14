# Product roadmap

Implementation proceeds as end-to-end slices described in [implementation-plan.md](implementation-plan.md). This roadmap describes product scope; it is not a promise to build all infrastructure before any flow is usable.

## MVP

- Account and profile
- Direct multipart upload for images and video
- Processing status and failure recovery
- Image posts, short video, and long video
- Following feed and discovery feed with cursor pagination
- Playback, likes, saves, follows, and top-level comments
- Basic report/block flows and admin moderation queue
- Accessibility, responsive layouts, and core web performance budgets

## Next

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
