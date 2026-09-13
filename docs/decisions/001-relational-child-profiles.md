# Relational child profiles and video progress (not a third table)

## Status

Accepted

## Context

Child profiles and their per-video watch progress were previously stored as a single JSONB
array (`app_settings.child_profiles`) on the singleton `app_settings` row. Every mutation —
adding a profile, appending watch history, or saving video progress — read the whole array,
mutated it in JavaScript, and wrote the whole array back. This had two problems:

- **No referential integrity.** Deleting a video left orphaned `videoProgress` entries in
  every profile silently; nothing enforced that a `videoId` referenced a real video.
- **Concurrency risk on video progress.** Two concurrent `POST /api/profiles/video-progress`
  requests for the *same* profile raced on the same JSONB row/column — a read-modify-write
  with no per-row locking, so a lost update was possible under concurrent saves (e.g. two
  tabs/devices resuming the same child's playback near-simultaneously).

## Decision

Replace the JSONB blob with exactly **two** new relational tables:

- `child_profiles` — one row per profile. `id` stays a client-generated string (not a serial),
  since it's already persisted in browser `localStorage` and referenced across requests.
  `watchHistory` **stays JSON** on this row (`jsonb`, capped at 100 entries) — it is read
  far more than it's concurrently written (append-only per profile, not per-profile-pair), so
  it doesn't have the same race-condition motivation as video progress, and a third table
  would add join/write complexity without fixing a real problem.
- `video_progress` — one row per `(profileId, videoId)` pair, with a unique index on that
  pair. `profile_id` FK → `child_profiles.id ON DELETE CASCADE`; `video_id` FK → `videos.id
  ON DELETE CASCADE`. The unique index makes the save path a single atomic
  `INSERT ... ON CONFLICT (profile_id, video_id) DO UPDATE` — concurrent saves for the *same*
  pair now serialize on Postgres's own conflict handling (last write wins, no lost update);
  concurrent saves for *different* `videoId`s under the same profile touch different rows and
  cannot overwrite one another.

No third table for watch history was introduced, and the public JSON API contracts consumed
by `lib/api.ts` / client components kept the same request and response shapes.

## Consequences

- **Easier:** per-video progress saves are now atomic and race-free by construction (the
  unique-constraint upsert), not by application-level locking. Deleting a video or a profile
  now correctly cascades its progress rows instead of leaving orphaned JSON entries. Category
  rename/removal against profiles is now a targeted `UPDATE ... WHERE id = ...` per changed
  row instead of a full-settings-row rewrite.
- **Harder:** this is the repo's first migration-file-based schema change (previously only
  `db:push` was ever used) — a one-time backfill migration was required to move existing
  `app_settings.child_profiles` data into the two new tables and drop the old column
  (`drizzle/0000`–`0002`; see `docs/architecture.md` §Data for the exact sequencing
  constraint around when the old column can be dropped relative to the backfill).
  `appendWatchHistory` remains a read-modify-write on one `child_profiles` row (not atomic) —
  accepted as an explicit non-goal since watch-history writes aren't concurrency-sensitive in
  the same way progress saves are.
