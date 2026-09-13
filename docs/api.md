# API Reference

All routes return JSON unless noted. Admin mutations require the `x-admin-password` header matching `ADMIN_PASSWORD`.

Client wrappers live in `lib/api.ts`. Validation schemas live in `lib/validation.ts`.

## Authentication

| Mechanism | Detail |
|-----------|--------|
| Admin header | `x-admin-password` compared in `lib/auth.ts` |
| Login route | `POST /api/admin/login` validates password for admin UI |
| Client storage | Password stored in `localStorage` under `babytube.admin.pw` |

Unauthorized mutating requests return `401` with `{ "error": "Unauthorized" }`.

## Videos

### `GET /api/videos`

Public. Returns all videos ordered by `position`, then `id`.

### `POST /api/videos`

Admin. Creates a video. Body validated by `createVideoInput`. Assigns next `position` and appends ID to queue.

**Response:** `201` with created video row.

### `GET /api/videos/:id`

Public. Returns one video or `404`.

### `PATCH /api/videos/:id`

Admin. Partial update validated by update schema.

### `DELETE /api/videos/:id`

Admin. Deletes video.

### `POST /api/videos/import-playlist`

Admin. Imports videos from a YouTube playlist URL. Requires server `YOUTUBE_API_KEY`. Has a `maxDuration` guard for Vercel serverless limits.

**Body:** `{ "url": "https://..." }`

**Response:** `{ "imported": number, "skipped": number }`

## Queue

### `GET /api/queue`

Public. Returns queue state (`queueVideoIds`). Empty list means the child-facing app shows the full library.

### `PATCH /api/queue`

Admin. Updates ordered queue video IDs.

## Settings

### `GET /api/settings`

Public. Returns app settings including resolved `contentCategories`.

### `PATCH /api/settings`

Admin. Updates `screenTimeMinutes` and/or `contentCategories`. Supports category rename via `categoryRename` field.

## Profiles

Child profiles and their per-video progress are stored relationally (`child_profiles` /
`video_progress` tables — see `docs/architecture.md` §Data). The JSON request/response shapes
below are unchanged from the prior JSONB-blob storage; only the server-side persistence
changed.

### `GET /api/profiles`

Public. Returns `{ childProfiles }`, each profile's nested `videoProgress` assembled from the
`video_progress` table (ordered `updatedAt` DESC).

### `PATCH /api/profiles`

Admin. Full-replace of the profile list (validated by `createProfilesInput`). Deletes
profiles omitted from the request (cascades their `video_progress` rows), upserts the rest.
Incoming `videoProgress` entries whose `videoId` no longer exists in the video catalog are
silently dropped (never a `4xx` for this). Returns `{ childProfiles }`.

### `POST /api/profiles/watch-history`

Records a watch-history entry for a child profile. Unauthenticated by profile (client-supplied
`profileId`; not gated by admin auth). An unknown profile is a `200` no-op, preserving the
existing contract. Returns `{ childProfiles }` (the full, reloaded list).

### `GET /api/profiles/video-progress`

Public, unauthenticated by profile. Query: `?profileId=`. `404` if the profile does not exist.
Returns `{ profileId, videoProgress }` for that one profile, ordered `updatedAt` DESC.

### `POST /api/profiles/video-progress`

Unauthenticated by profile. Body: `{ profileId, videoId, positionSeconds, totalSeconds, clear? }`.
Atomic upsert on the unique `(profile_id, video_id)` pair; concurrent saves for the same pair
serialize on that constraint (the later write wins) without overwriting different video rows.
Caps each profile at 50 progress rows (oldest by `updatedAt`, then lowest row id, evicted).
`clear: true` or a non-trackable duration (`totalSeconds` ≤ 5 minutes) removes the entry for
that `videoId`. `404` if the profile does not exist. If `videoId` is not in the video catalog,
the request is a silent no-op: `200` with the profile's current, unchanged `videoProgress`.
Returns `{ profileId, videoProgress }`.

## Admin

### `POST /api/admin/login`

Validates admin password for the admin gate UI.

## Error Conventions

| Status | Typical body |
|--------|----------------|
| `400` | `{ "error": ... }` or Zod `flatten()` object |
| `401` | `{ "error": "Unauthorized" }` |
| `404` | `{ "error": "Not found" }` or empty |
| `500` | Generic error message; no stack traces in production |

## Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Server | Postgres connection |
| `ADMIN_PASSWORD` | Server | Admin API password |
| `YOUTUBE_API_KEY` | Server | YouTube Data API for playlist import |

Never expose server env vars to the client or `NEXT_PUBLIC_*` keys for these values.
