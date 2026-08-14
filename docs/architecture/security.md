# Security baseline

- Buckets are private. Delivery occurs through signed CDN/object URLs with short expirations where authorization is required.
- The server creates object keys; client filenames are display metadata only.
- Validate magic bytes, decoded media properties, size, duration, dimensions, codec/container allowlists, and decompression limits.
- Treat FFmpeg inputs as hostile. Run workers unprivileged with resource, time, filesystem, and network limits.
- Use multipart upload quotas and expire abandoned uploads.
- Separate original, quarantine, and published paths. Never publish before processing succeeds.
- Apply rate limits to authentication, upload-session creation, comments, follows, and engagement writes.
- Model block/mute/privacy authorization server-side and apply it both to listing and direct-object access.
- Keep refresh/session tokens in secure, HTTP-only cookies; protect state-changing browser requests against CSRF as appropriate.
- Record moderation and administrative actions in an append-only audit trail.
- Do not log tokens, cookies, presigned URLs, private object keys, raw credentials, or unnecessary personal data.
- Define retention/deletion for originals, renditions, user data, analytics events, and backups before launch.

