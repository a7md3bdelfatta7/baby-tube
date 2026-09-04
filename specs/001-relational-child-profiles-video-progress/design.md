# Design: Relational Child Profiles & Video Progress

- **Status:** Approved (safe-defaults workflow, per user authorization)
- **Mode:** `existing` project change, `automated` orchestration
- **Context brief:** `context-brief.md` (same directory)
- **Execution:** `brainstorm-20260904T121100Z`, 2026-09-04T12:11:00Z

## 1. Change request (restated)

Replace the single `app_settings.child_profiles` JSONB blob with two normalized
tables — `child_profiles` and `video_progress` — keeping `watchHistory` as a
JSONB column on `child_profiles` (no third table). Ship a generated, reviewable
migration with a safe/idempotent backfill (never `db:push`), relational profile
CRUD, an atomic/concurrency-safe per-video progress upsert, FK cascades +
indexes, docs, and tests, without disturbing unrelated uncommitted work
(in particular the in-flight JSON-based video-progress feature this change
relationalizes, not reverts).

## 2. Clarifications resolved by explicit defaults (no user input needed)

The context brief flagged four open points; all are resolved by the
`DEFAULTS`/`RAW_CHANGE_REQUEST` the user already supplied, so none rise to a
"material product/data choice" requiring a new round of questions:

| Open point | Resolution |
|---|---|
| Test approach (tsx scripts vs. new framework) | tsx-based scripts (no new test dependency) — "impossible" bar not met. |
| `video_progress.video_id` FK cascade behavior | `ON DELETE CASCADE` to `videos.id`, per default. |
| `child_profiles`/`video_progress` FK to profile | `ON DELETE CASCADE` to `child_profiles.id`, per default. |
| docker-compose `db:push` step | Left unchanged; deployment migration step documented separately (§8). |
| Backfill/drop-column transactionality | Single Drizzle migration file = single Postgres transaction (confirmed: `drizzle-orm/postgres-js/migrator` wraps each migration file atomically) → backfill INSERTs + `DROP COLUMN` happen together; a mid-way failure rolls back, so the JSONB source is retained automatically until all inserts succeed. |

No remaining question meets the bar for `[NEEDS USER INPUT]`.

## 3. Approaches considered

### A. Two tables + JS-mediated backfill script (rejected)

Write the backfill as a one-off Node/`tsx` script run manually against
production, separate from the Drizzle migration files. Simpler to write, but
violates "never `db:push`... use `db:generate`/`db:migrate`" intent: it
decouples schema change from data migration, isn't replayed by
`db:migrate`, and isn't reviewable in the same diff as the DDL. Rejected —
doesn't meet the "safe, reviewable migration" requirement.

### B. Two tables + hand-authored SQL backfill inside the generated migration (recommended)

Use `drizzle-kit generate` for the DDL (new tables, drop old column) and
`drizzle-kit generate --custom` to insert a hand-written SQL backfill
(`INSERT ... SELECT ... FROM jsonb_array_elements(...)`) into the same
migration sequence, so `pnpm run db:migrate` applies schema + data migration
together, atomically, and idempotently (`ON CONFLICT DO NOTHING`, FK-safe
`WHERE EXISTS` guards against orphaned `videoId`s). This is the only option
that satisfies "safe backfill" + "never `db:push`" + "same transactional
migration" simultaneously, and it matches the existing repo's Drizzle idioms
(`onConflictDoUpdate`/`onConflictDoNothing` already used throughout
`app-settings-server.ts`, `categories-server.ts`, profile routes).

**Bootstrapping nuance (why this needs a baseline migration):** this repo has
never generated a migration before (`drizzle/` doesn't exist) — every real
environment (dev via `docker compose` → `db:push`, and production per
`AGENT.md`) already has `videos`/`app_settings` created by `db:push`, not by
any migration file. If `db:generate` naively diffs "no schema" → "current
schema" it would emit `CREATE TABLE videos ...` / `CREATE TABLE app_settings
...` as part of migration `0000`, which would fail with "relation already
exists" the first time `db:migrate` runs against any pre-existing database.
The safe sequence is:

1. `pnpm run db:generate` once, **before** editing `db/schema.ts`, to emit a
   **baseline** migration (`0000_*.sql`) that mirrors the tables/columns that
   already exist today (`videos`, `app_settings` incl. the JSONB
   `child_profiles` column). This file is a faithful snapshot, not new work.
2. Edit `db/schema.ts` (§4), then `pnpm run db:generate` again for migration
   `0001_*.sql`: `CREATE TABLE child_profiles`, `CREATE TABLE video_progress`
   + indexes/FKs, hand-edited (via `--custom` placeholder) to insert the
   backfill INSERTs before a trailing `ALTER TABLE app_settings DROP COLUMN
   child_profiles`.
3. **Document** (not automate) that any environment with pre-existing data
   (i.e. anywhere `db:push` already ran) must have migration `0000` recorded
   as already-applied in Drizzle's migrations-tracking table before the first
   `db:migrate` run, so it's skipped rather than re-executed. Fresh/empty
   databases (CI, a new dev volume) apply `0000` then `0001` cleanly with no
   manual step. This is exactly the "document deployment migration step"
   default — see §8.

### C. Two tables, keep `app_settings.child_profiles` column temporarily as a dual-write shim (rejected)

Write to both the JSONB column and the new tables for one release, cut reads
over gradually. Adds real complexity (two write paths, drift risk) for a
project with no live production traffic pressure forcing a zero-downtime
constraint, and directly conflicts with "drop old column... in same
transactional migration" default. Rejected as unnecessary for this scale.

**Recommendation: B.** It is the only approach that satisfies every explicit
default (never `db:push`, safe/idempotent backfill, same-transaction drop,
reviewable migration) without inventing an unrequested dual-write phase.

## 4. Data model (`db/schema.ts`)

```ts
export const childProfiles = pgTable("child_profiles", {
  id: text("id").primaryKey(), // client-generated (createProfileId()), stays a string
  name: text("name").notNull(),
  birthDate: text("birth_date").notNull().default(""),
  screenTimeMinutes: integer("screen_time_minutes").notNull().default(15),
  screenTimeResetHours: integer("screen_time_reset_hours").notNull().default(24),
  preferredCategories: jsonb("preferred_categories")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  watchHistory: jsonb("watch_history")
    .$type<WatchHistoryEntry[]>()
    .notNull()
    .default(sql`'[]'::jsonb`), // stays JSON per explicit "no third table" constraint
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const videoProgress = pgTable(
  "video_progress",
  {
    id: serial("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => childProfiles.id, { onDelete: "cascade" }),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    positionSeconds: integer("position_seconds").notNull(),
    totalSeconds: integer("total_seconds").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    profileVideoUnique: uniqueIndex("video_progress_profile_video_unique").on(
      table.profileId,
      table.videoId,
    ),
    profileIdIdx: index("video_progress_profile_id_idx").on(table.profileId),
  }),
);
```

- `appSettings.childProfiles` (JSONB column) is **removed** from the schema
  (dropped by the migration, §3/B).
- `ChildProfileRow = typeof childProfiles.$inferSelect` becomes the DB-facing
  type. The existing **API-facing** `ChildProfile` type (nested
  `videoProgress: VideoProgressEntry[]`) is preserved unchanged as the
  response DTO — assembled server-side by joining `video_progress`, so
  `lib/api.ts` and every client consumer (`app/page.tsx`,
  `app/watch/[id]/page.tsx`, `components/WatchTimer.tsx`,
  `components/admin/*`, `lib/profiles.ts`) needs zero changes.
- `id` stays `text`, never `serial` — required for the `localStorage`-persisted
  client identity contract.

## 5. Server-side data access (new module, per existing `*-server.ts` split)

`lib/child-profiles-server.ts` (new):

- `listChildProfiles(allowed): Promise<ChildProfile[]>` — select all
  `child_profiles`, batch-select `video_progress` for those ids in one query,
  group by `profileId`, assemble the DTO (order profiles by `createdAt` ASC
  to keep deterministic ordering equivalent to today's JSON-array order).
- `replaceChildProfiles(profiles: ChildProfileInput[], allowed): Promise<ChildProfile[]>`
  — full-replace semantics identical to today's `PATCH /api/profiles` (the
  admin UI round-trips the entire array, including `videoProgress`, on every
  save — confirmed in `components/admin/profiles.tsx`). One `db.transaction`:
  1. Delete `child_profiles` rows whose `id` is not in the incoming set
     (cascades their `video_progress` rows automatically).
  2. `insert(...).onConflictDoUpdate({target: id, set: {...}})` per incoming
     profile (name/birthDate/screenTimeMinutes/screenTimeResetHours/
     preferredCategories/watchHistory).
  3. Per profile, replace its `video_progress` rows to match the incoming
     `videoProgress` array exactly: delete rows not present in the incoming
     list, `onConflictDoUpdate` upsert the rest — preserves the "full
     replace" contract the admin PATCH already has today.
- `getOrCreateSettings()` reuse: continues to be imported from
  `lib/app-settings-server.ts` for the (now `childProfiles`-free) settings
  row; the three route handlers' duplicated local copies are consolidated
  into that one import while touching these files anyway (small, in-scope
  cleanup — not a new abstraction).

`lib/video-progress-server.ts` (new, focused single-purpose module):

- `getVideoProgress(profileId): Promise<VideoProgressEntry[]>` — select by
  `profileId`, order by `updatedAt` DESC.
- `upsertVideoProgress(profileId, videoId, positionSeconds, totalSeconds): Promise<VideoProgressEntry[]>`
  — **one atomic statement**:
  `insert(videoProgress).values({...}).onConflictDoUpdate({ target: [videoProgress.profileId, videoProgress.videoId], set: { positionSeconds, totalSeconds, updatedAt } })`,
  scoped to exactly one `(profile, video)` row — this is the concurrency fix:
  two concurrent saves for the same profile+video serialize on that single
  row via Postgres's own unique-constraint conflict handling; saves for
  *different* videos never contend at all (today's full-row JSON rewrite
  makes even unrelated videos contend). Followed, in the same
  `db.transaction`, by a scoped cap-enforcement delete (§6).
- `clearVideoProgress(profileId, videoId): Promise<VideoProgressEntry[]>` —
  single scoped `delete().where(and(eq(profileId), eq(videoId)))`, used for
  the `clear: true` / non-trackable-video path that today's route already
  branches on.
- Reuses `lib/video-progress.ts`'s `isTrackableVideo` unchanged (already
  storage-agnostic, per the reuse map).

## 6. Cap enforcement at the relational layer

Existing caps are preserved, moved to whichever layer is natural:

- **≤12 profiles, ≤100 watch-history entries** — unchanged: still enforced by
  `lib/validation.ts` Zod schemas (`.max(12)`, `.max(100)`) on the
  full-replace PATCH input, and by the same `slice(0, MAX_HISTORY_ITEMS)`
  JS logic in the watch-history route, now scoped to one `child_profiles` row
  instead of the whole settings singleton (a natural side benefit: writes
  for different profiles' watch history no longer contend on the same row).
- **≤50 progress entries per profile** — can no longer be a JS array slice
  (each entry is its own row). Enforced by one extra scoped, indexed SQL
  statement run in the same transaction as the upsert:
  ```sql
  DELETE FROM video_progress
  WHERE profile_id = $1
    AND video_id NOT IN (
      SELECT video_id FROM video_progress
      WHERE profile_id = $1
      ORDER BY updated_at DESC
      LIMIT 50
    );
  ```
  This touches only one profile's rows (index-assisted by
  `video_progress_profile_id_idx`), not the whole table — consistent with
  "scoped atomic" intent. Under pathological concurrent writes to the *same*
  profile across many different videos simultaneously, the cap could
  transiently overshoot by a small amount before the next write's cleanup
  catches up; this is a soft housekeeping limit (not a security/integrity
  boundary) and is strictly better than today's behavior, so it's accepted
  rather than solved with heavier locking.
- **Progress only tracked when `totalSeconds > 5min`** — unchanged, already
  encoded in `videoProgressInput`'s Zod `.refine()` and `isTrackableVideo()`.

## 7. Route handlers (preserve request/response JSON shapes exactly)

| Route | Change |
|---|---|
| `GET /api/profiles` | Calls `listChildProfiles()` instead of parsing `settings.childProfiles`. Response shape `{ childProfiles }` unchanged. |
| `PATCH /api/profiles` | Calls `replaceChildProfiles()` inside the new module. Same admin auth check, same input schema, same response shape. |
| `POST /api/profiles/watch-history` | Reads/writes one `child_profiles` row (by `profileId`) instead of the settings singleton; same read-modify-write JS pattern (unchanged risk profile, not in scope to fix — only `video_progress` had the explicit atomicity requirement). Same response shape `{ childProfiles }`. |
| `GET /api/profiles/video-progress` | Calls `getVideoProgress(profileId)`. Same response shape `{ profileId, videoProgress }`. 404 if profile doesn't exist (existing behavior, now an `EXISTS` check against `child_profiles`). |
| `POST /api/profiles/video-progress` | Calls `upsertVideoProgress`/`clearVideoProgress`. Same response shape. This is the route the concurrency requirement targets. |

`lib/categories-server.ts`'s `applyCategoryListUpdate()` is updated to iterate
`db.select().from(childProfiles)` and `update(childProfiles).set({preferredCategories}).where(eq(id, ...))` per row, replacing its current
`settings.childProfiles.map(...)` + whole-row rewrite — fixes the flagged
risk (§9 of the brief) that this function would otherwise silently break
after the migration.

## 8. Migration, backfill & deployment step

Sequence (§3/B), files land under `drizzle/`:

1. `0000_baseline.sql` — generated from today's schema, before any edits;
   mirrors existing `videos`/`app_settings` (incl. JSONB `child_profiles`)
   exactly as `db:push` created them.
2. `0001_relational_child_profiles.sql` — generated from the edited schema
   (§4), then hand-edited to add, in this order, inside the one migration
   file/transaction:
   1. `CREATE TABLE child_profiles (...)`
   2. `CREATE TABLE video_progress (...)` with FKs + unique/plain indexes
   3. Backfill `INSERT INTO child_profiles SELECT ... FROM
      jsonb_array_elements(app_settings.child_profiles) ... ON CONFLICT (id)
      DO NOTHING`
   4. Backfill `INSERT INTO video_progress SELECT ... FROM
      jsonb_array_elements(profile->'videoProgress') ... WHERE EXISTS
      (SELECT 1 FROM videos WHERE videos.id = (entry->>'videoId')::int) ON
      CONFLICT (profile_id, video_id) DO NOTHING` — the `WHERE EXISTS` guard
      is required because the new `video_id` FK is `NOT NULL` + cascading,
      and today's JSON model has zero referential integrity, so any
      already-orphaned `videoId` (video previously hard-deleted) must be
      skipped rather than violate the FK.
   5. `ALTER TABLE app_settings DROP COLUMN child_profiles;`
   - Because Drizzle wraps one migration file in one Postgres transaction,
     steps 3–5 either all commit or all roll back — the JSONB source column
     is only gone once every backfill row has landed, satisfying "retained
     until all inserts succeed" without extra application code.
3. **Deployment step (documented in `docs/architecture.md`/`AGENT.md`, not
   automated):** any database that already has `app_settings`/`videos`
   (i.e. every real dev/prod DB today, since `db:push` created them) needs
   migration `0000` marked as already-applied in Drizzle's migrations table
   before the first `pnpm run db:migrate` run, so `0000`'s `CREATE TABLE`
   statements are skipped and only `0001` executes. Fresh databases (new CI
   run, brand-new dev volume) need no manual step — `0000` then `0001` apply
   cleanly in order. Production: run `pnpm run db:migrate` against
   `DATABASE_URL` deliberately, before/alongside the Vercel deploy, per
   `AGENT.md`'s existing "apply schema changes deliberately" guidance —
   this is the first time that guidance maps to `db:migrate` instead of
   `db:push`.
4. **`docker-compose.yml` is left unchanged** (per default): its
   `db:push` startup step keeps working for fresh dev volumes (no legacy
   data to backfill) but does **not** run the hand-authored backfill SQL —
   documented as a caveat: a developer with an *existing* local volume that
   has real profile data should run `pnpm run db:migrate` manually once
   instead of relying on `db:push` to preserve it.
5. `pnpm run db:generate` is the validation gate for the schema half (confirms
   the SQL compiles cleanly); `db:push`/`db:migrate` are **not** run against
   any real database as part of this workflow unless the user explicitly
   asks — matches the "never `db:push`" constraint and the brief's stated
   validation gate.

## 9. Testing (tsx-based, no new dependency)

- Pure-logic assertions for the new SQL-adjacent helpers that don't need a
  live DB (cap-eviction ordering logic, DTO assembly/shape mapping,
  trackability threshold) as small `tsx`-run assertion scripts, mirroring the
  style already possible with `lib/video-progress.ts`'s pure functions.
- One optional, explicitly-opt-in integration script
  (`scripts/verify-video-progress-db.ts`, run via `tsx`) that, only when
  `DATABASE_URL` is set, exercises the real atomic upsert against a local/dev
  Postgres: concurrent upserts for the same `(profileId, videoId)` resolve to
  one row with the latest `updatedAt`; concurrent upserts for different
  `videoId`s under the same profile never block each other; the cap-50
  cleanup deletes the correct oldest rows. Documented as a manual/local
  verification step, not part of the required `pnpm run lint && pnpm run
  build` gate (no `DATABASE_URL` guaranteed in CI/sandbox).
- `docs/architecture.md` §Testing note ("no automated test suite configured
  yet") is updated to describe these two script types and how to run them.

## 10. Docs updates

- `docs/api.md` §Profiles: add the previously-undocumented
  `GET`/`POST /api/profiles/video-progress` routes (payload/response shapes,
  unauthenticated-by-design per §7 of the brief), and note the storage
  change (relational, same JSON contract) for all four profile routes.
- `docs/architecture.md` §Data: replace the JSONB-blob description with
  `child_profiles`/`video_progress` table descriptions, FK/cascade behavior,
  and the migration bootstrapping note (§8).
- `docs/decisions/`: one new ADR (`docs/decisions/<n>-relational-child-profiles.md`)
  per the existing template — "choosing a new data model or persistence
  approach" is explicitly listed as an ADR-worthy trigger.

## 11. Out of scope (explicitly, to keep this change focused)

- No profile authentication (unchanged, per brief §7).
- `watch-history` route's read-modify-write pattern is relocated to a
  per-profile row but not made atomic — only `video_progress` had an explicit
  atomicity requirement.
- `docker-compose.yml`/Dockerfile behavior is unchanged, per default.
- No dual-write/zero-downtime phase (Approach C, rejected §3).
- `watchHistory` does not get FK-linked to `videos` (stays plain JSONB, no
  cascade) — consistent with "no third table" and brief §5; a video deletion
  still can't clean up JSON watch-history entries, same as today.

## 12. Risks

- **Migration-bootstrapping step is manual and easy to skip** on an
  environment that already has data outside of this workflow's control
  (documented in §8, but relies on whoever runs the first `db:migrate`
  reading the doc). Mitigated by making it explicit in both
  `docs/architecture.md` and `AGENT.md`'s deployment notes, and by the
  idempotent `ON CONFLICT DO NOTHING` backfill guarding against accidental
  double-application.
- **Cap-50 soft overshoot** under heavy same-profile concurrent writes
  (§6) — accepted, non-critical, strictly better than today.
- **`docker-compose` dev flow diverges from the documented migration path**
  for anyone with pre-existing local data (§8/4) — accepted per explicit
  default to leave compose unchanged; documented as a caveat rather than
  silently fixed.
