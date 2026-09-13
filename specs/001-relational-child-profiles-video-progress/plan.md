# Plan: Relational Child Profiles & Video Progress

- **Status:** Approved / ready for implementation (plan phase — no code executed, no
  migration generated/applied)
- **Mode:** `existing` project, `manual` SpecKit mode
- **Inputs:** `spec.md` (incl. FR-37), `context-brief.md`, `design.md` (all in this directory)
- **Execution:** `plan-20260904T121600Z`, 2026-09-04T12:16:00Z

This plan implements `design.md`'s Approach B (two tables, generated + hand-authored
migration, no `db:push`) with one validated refinement to the migration-safety
mechanism (see §8, Decision D1). All FR references are to `spec.md` §4, including
FR-37 (silent no-op for a stale/missing `videoId` on `POST /api/profiles/video-progress`),
added after the initial draft of this plan.

## 1. Technical context

- **Runtime/framework:** Next.js `16.2.4` (App Router), TypeScript, React 18. `pnpm`.
- **DB/ORM:** Postgres, Drizzle ORM `^0.36.0`, `drizzle-kit ^0.28.0`, `postgres` (postgres-js)
  driver. `drizzle.config.ts`: schema `./db/schema.ts`, out `./drizzle` (directory does not
  exist yet — this is the repo's first generated migration).
- **Migration runner:** `db/migrate.ts` → `drizzle-orm/postgres-js/migrator` `migrate()`.
  **Verified from `node_modules/drizzle-orm/pg-core/dialect.js`** (not assumed): on each run
  it creates `drizzle.__drizzle_migrations` (`CREATE TABLE/SCHEMA IF NOT EXISTS`), reads the
  single most-recent applied row (`order by created_at desc limit 1`), then — inside **one**
  `session.transaction()` — executes every migration file whose journal timestamp
  (`folderMillis`) is greater than that watermark, in order, each followed by its own insert
  into `__drizzle_migrations`. This means: (a) on a brand-new DB *and* on an existing
  `db:push`-created DB, the exact same set of pending files (0000, 0001, 0002 below) runs
  together in **one transaction** — stronger atomicity than "one file = one transaction,"
  and it is what makes FR-12 (all-or-nothing) hold without extra application code; (b) there
  is no built-in "skip this file, it's already applied logically" concept — only "already
  applied" (by the watermark) or "run it." This is why any file that might hit an
  already-existing object **must be internally idempotent SQL**, not something bookkeeping
  can paper over (§8, Decision D1).
- **Test approach:** `tsx` (existing devDependency) for plain script-based assertions; no new
  test framework (FR-35, confirmed no-op decision in `design.md` §2).
- **Validation gate (this change):** `pnpm run lint`, `pnpm run build`, `pnpm run db:generate`
  (produces SQL, touches no database). `db:push` and `db:migrate` against a real database are
  out of scope for authoring and are **not** run by this plan or its implementation phase
  unless the user explicitly asks later.

## 2. Architecture overview

Two new normalized tables replace `app_settings.child_profiles` (JSONB); `watchHistory` stays
JSONB on the profile row (FR-1–FR-3). Three currently-duplicated route handlers become thin
wrappers around two new server modules, following the existing `lib/*-server.ts` split:

```
app/api/profiles/route.ts              ──┐
app/api/profiles/watch-history/route.ts──┼─▶ lib/child-profiles-server.ts   ──▶ db (child_profiles, video_progress)
app/api/profiles/video-progress/route.ts─┘   lib/video-progress-server.ts  ──▶ db (video_progress)

lib/categories-server.ts::applyCategoryListUpdate() ──▶ db (child_profiles) directly (small in-place rewrite)
```

- `lib/child-profiles-server.ts` (new) — profile CRUD + DTO assembly (joins `video_progress`
  per profile). Independent unit; depends only on `db`, `lib/validation.ts` types, schema.
- `lib/video-progress-server.ts` (new) — atomic per-`(profile, video)` upsert/clear + cap
  enforcement. Independent unit; depends only on `db` and `lib/video-progress.ts`
  (`isTrackableVideo`, unchanged/reused as-is).
- Both new modules are independently unit-testable with `tsx` scripts (no shared mutable
  state) — this is the parallelizable seam for the later implementation/task phase.
- Route handlers stay thin: validate (existing Zod schemas) → call server module → respond
  with the unchanged JSON shape. No route contains a raw Drizzle query after this change.
- `getOrCreateSettings()` — the three routes' duplicated local copies are replaced by the
  single import from `lib/app-settings-server.ts` (in-scope, incidental cleanup while these
  files are already being edited for the storage change — not a new abstraction).

## 3. Data model

### 3.1 `db/schema.ts` additions (exact shapes)

```ts
export const childProfiles = pgTable("child_profiles", {
  id: text("id").primaryKey(), // client-generated (createProfileId()); never serial
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
    .default(sql`'[]'::jsonb`),
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

export type ChildProfileRow = typeof childProfiles.$inferSelect;
export type VideoProgressRow = typeof videoProgress.$inferSelect;
```

- `appSettings.childProfiles` field is **removed** from `db/schema.ts` (dropped by migration
  0002, §5). `AppSettings` type shrinks accordingly.
- The API-facing `ChildProfile` type (nested `videoProgress: VideoProgressEntry[]`,
  `watchHistory: WatchHistoryEntry[]`) is kept **unchanged** in `db/schema.ts` as the DTO type
  — it is no longer a table-inferred type, just the response shape assembled in
  `lib/child-profiles-server.ts`. Zero client-side changes required (FR-19–FR-24).
- FKs: `video_progress.profile_id → child_profiles.id ON DELETE CASCADE` (FR-6),
  `video_progress.video_id → videos.id ON DELETE CASCADE` (FR-7). Unique
  `(profile_id, video_id)` is both the cap-accounting key and the `onConflictDoUpdate` target
  for the atomic upsert (FR-5, FR-25). `profile_id` index serves the scoped `GET ?profileId=`
  and cap-cleanup query (FR-8).

## 4. Contracts / interfaces

### 4.1 `lib/child-profiles-server.ts` (new)

```ts
/** Assembles the full DTO: all profiles + their video_progress, ordered by createdAt ASC
 * (deterministic, matches today's JSON-array insertion order). */
export async function listChildProfiles(allowed: readonly string[]): Promise<ChildProfile[]>;

/** Full-replace semantics identical to today's admin PATCH. One db.transaction():
 *  1. Delete child_profiles rows whose id is not in the incoming set (cascades video_progress).
 *  2. insert(...).onConflictDoUpdate({ target: id, set: {...} }) per incoming profile.
 *  3. Per profile, replace its video_progress rows to match incoming videoProgress exactly
 *     (delete rows not present, onConflictDoUpdate upsert the rest) — AFTER dropping any
 *     incoming entry whose videoId is not in the video catalog (FR-36, silent omit, no 4xx).
 */
export async function replaceChildProfiles(
  profiles: readonly ChildProfileInput[],
  allowed: readonly string[],
): Promise<ChildProfile[]>;

/** Read-modify-write on ONE profile row (watch-history is not required to be atomic — FR-31
 * / spec §Non-goals). Caps at MAX_HISTORY_ITEMS=100, newest-first. 404 semantics via null return. */
export async function appendWatchHistory(
  profileId: string,
  entry: { videoId: number; title: string; status: "completed" | "skipped"; watchedSeconds: number },
): Promise<ChildProfile | null>;

export async function profileExists(profileId: string): Promise<boolean>;
```

### 4.2 `lib/video-progress-server.ts` (new)

```ts
/** Ordered by updatedAt DESC, scoped to one profile (index-assisted). */
export async function getVideoProgress(profileId: string): Promise<VideoProgressEntry[]>;

/** One atomic statement + one scoped cap-cleanup statement, same db.transaction():
 *   insert(videoProgress).values({profileId, videoId, positionSeconds, totalSeconds, updatedAt})
 *     .onConflictDoUpdate({ target: [videoProgress.profileId, videoProgress.videoId],
 *                            set: { positionSeconds, totalSeconds, updatedAt } })
 *   -- then, same profile only:
 *   DELETE FROM video_progress WHERE profile_id = $1 AND video_id NOT IN
 *     (SELECT video_id FROM video_progress WHERE profile_id = $1 ORDER BY updated_at DESC LIMIT 50)
 * Returns null (caller treats as "not stored, no error") if videoId does not exist in
 * `videos` — checked via an EXISTS query BEFORE the insert, not by catching a raw FK-violation
 * error, per "handle expected errors explicitly" (AGENTS.md). This is a defensive addition:
 * today's POST route never checks video existence at all (verified in current
 * app/api/profiles/video-progress/route.ts); the FK makes that omission a hard constraint now.
 */
export async function upsertVideoProgress(
  profileId: string,
  videoId: number,
  positionSeconds: number,
  totalSeconds: number,
): Promise<VideoProgressEntry[] | null>; // null = profile not found

export async function clearVideoProgress(
  profileId: string,
  videoId: number,
): Promise<VideoProgressEntry[] | null>;
```

- Both `upsertVideoProgress`/`clearVideoProgress` reuse `isTrackableVideo` from
  `lib/video-progress.ts` unchanged (already storage-agnostic, per context brief §6 reuse map).
- **Stale/missing `videoId` on the single-entry POST is a decided requirement (FR-37), not an
  open question:** if `videoId` is not in the video catalog, `upsertVideoProgress` MUST be a
  silent no-op — no insert/update, no FK/integrity error surfaced, that profile's current
  `videoProgress` list unchanged, response `200` with the same `{ profileId, videoProgress }`
  shape as a successful save. The EXISTS check (§8 D3) is precisely what makes this possible:
  it short-circuits *before* attempting the `onConflictDoUpdate`, so the route never needs to
  catch a raw Postgres FK-violation to satisfy FR-37. Unknown `profileId` remains 404 (FR-22,
  unaffected by FR-37).

### 4.3 Route handlers (`app/api/profiles/**`) — no response-shape changes

| Route | New body |
|---|---|
| `GET /api/profiles` | `listChildProfiles(allowed)` → `{ childProfiles }` |
| `PATCH /api/profiles` | same admin-auth check, same input schema → `replaceChildProfiles(...)` → `{ childProfiles }` |
| `POST /api/profiles/watch-history` | `appendWatchHistory(...)`; 404 if `null` → `{ childProfiles }` (assembled via `listChildProfiles`-style single-profile helper, or reload) |
| `GET /api/profiles/video-progress` | `profileExists` (404 if false) then `getVideoProgress(profileId)` → `{ profileId, videoProgress }` |
| `POST /api/profiles/video-progress` | `upsertVideoProgress`/`clearVideoProgress`; 404 if profile missing, 200 silent no-op if `videoId` unknown (FR-37) → `{ profileId, videoProgress }` |

`lib/categories-server.ts::applyCategoryListUpdate()` — replace the
`settings.childProfiles.map(...)` + whole-settings-row rewrite with:
`db.select().from(childProfiles)` then, per changed row,
`db.update(childProfiles).set({ preferredCategories }).where(eq(childProfiles.id, row.id))`
(FR-30). Small, in the same function, no new abstraction.

## 5. Migration ordering, backfill, casts, defaults, dedup (FR-9–FR-18)

Three files under `drizzle/`, generated/authored in this order, none applied by this plan:

### 0000 — baseline snapshot (generated from **today's unedited** `db/schema.ts`)

`pnpm run db:generate` run once **before** any schema edit. Emits `CREATE TABLE "videos" (...)`
and `CREATE TABLE "app_settings" (...)` (the latter still including the JSONB
`child_profiles` column, since this is a faithful pre-edit snapshot). **Required hand-edit:**
change both statements to `CREATE TABLE IF NOT EXISTS "videos" (...)` /
`CREATE TABLE IF NOT EXISTS "app_settings" (...)`. This is the only edit 0000 needs (§8, D1)
— editing generated `.sql` text does not affect `drizzle-kit`'s own `meta/*_snapshot.json`
diff bookkeeping, so future `db:generate` diffs are unaffected.

### 0001 — new tables (generated from **edited** `db/schema.ts`)

`CREATE TABLE "child_profiles" (...)`, `CREATE TABLE "video_progress" (...)` with its FKs and
the two indexes (§3.1). Both tables are new in every environment (fresh or `db:push`-created),
so this file needs **no** idempotency hand-edit — plain generated DDL is already safe.

### 0002 — backfill + drop (hand-authored via `drizzle-kit generate --custom`)

Runs after 0001 (tables must exist first), before nothing else. Sketch (final column/type
names confirmed against §3.1 at implementation time):

```sql
-- 1) Backfill child_profiles from the JSON blob. jsonb_array_elements preserves array
--    order, so ON CONFLICT DO NOTHING keeps the *first* occurrence of a duplicate id —
--    matching lib/validation.ts's existing dedupeProfiles() "keep first" semantics (FR-11).
INSERT INTO child_profiles
  (id, name, birth_date, screen_time_minutes, screen_time_reset_hours,
   preferred_categories, watch_history)
SELECT
  elem->>'id',
  elem->>'name',
  COALESCE(elem->>'birthDate', ''),
  COALESCE((elem->>'screenTimeMinutes')::int, 15),
  COALESCE((elem->>'screenTimeResetHours')::int, 24),
  COALESCE(elem->'preferredCategories', '[]'::jsonb),
  COALESCE(elem->'watchHistory', '[]'::jsonb)
FROM app_settings, jsonb_array_elements(app_settings.child_profiles) AS elem
WHERE app_settings.id = 1
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

-- 2) Backfill video_progress. WHERE EXISTS guard skips any videoId no longer in `videos`
--    (FR-10) — required because video_id is NOT NULL + FK; today's JSON model enforces
--    nothing here, so orphaned ids are expected and must not abort the migration.
INSERT INTO video_progress
  (profile_id, video_id, position_seconds, total_seconds, updated_at)
SELECT
  elem->>'id',
  (prog->>'videoId')::int,
  (prog->>'positionSeconds')::int,
  (prog->>'totalSeconds')::int,
  COALESCE((prog->>'updatedAt')::timestamptz, now())
FROM app_settings,
     jsonb_array_elements(app_settings.child_profiles) AS elem,
     jsonb_array_elements(elem->'videoProgress') AS prog
WHERE app_settings.id = 1
  AND EXISTS (SELECT 1 FROM videos WHERE videos.id = (prog->>'videoId')::int)
ON CONFLICT (profile_id, video_id) DO NOTHING;
--> statement-breakpoint

-- 3) Drop the migrated JSON column. IF EXISTS makes this idempotent if anyone re-runs the
--    raw SQL outside the tracked migrate path (defensive; normal path only runs this once).
ALTER TABLE app_settings DROP COLUMN IF EXISTS child_profiles;
```

- **Casts:** `::int` for numeric JSON fields (JSON numbers arrive untyped), `::timestamptz`
  for `updatedAt` (JSON ISO datetime strings). `COALESCE` supplies today's Zod-read defaults
  (`birthDate` default `""`, `screenTimeMinutes` default `15`, `screenTimeResetHours` default
  `24`) for any legacy row missing a field, matching `createChildProfileRead`'s lenient-read
  behavior (context brief §4) instead of failing the backfill row.
- **Dedup:** `ON CONFLICT DO NOTHING` on both inserts, keyed on the same uniqueness the tables
  already enforce (`id` PK; `(profile_id, video_id)` unique) — re-running the backfill portion
  never duplicates rows (FR-11).
- **All-or-nothing (FR-12):** per §1's verified migrator behavior, 0000+0001+0002 execute
  inside one Postgres transaction on first run in any environment; a failure anywhere rolls
  the whole batch back, so `app_settings.child_profiles` is never left half-migrated and the
  new tables are never left as a partial copy.

### Environment outcomes (FR-15–FR-17), validated mechanism (no journal fakery — §8 D1)

- **Empty DB:** 0000's `IF NOT EXISTS` CREATEs actually create `videos`/`app_settings`
  (with the JSONB column); 0001 creates the two new tables; 0002's backfill selects zero rows
  (no data) and drops the column. Net result: today's baseline schema + the two new empty
  tables, JSON column gone. FR-15 met.
- **Existing `db:push`-created DB:** 0000's `IF NOT EXISTS` CREATEs no-op (tables already
  present) — **no "relation already exists" failure**, because Postgres's `CREATE TABLE IF
  NOT EXISTS` skips the whole statement when the name exists, without checking column parity.
  0001 creates the two new tables (genuinely new everywhere). 0002 backfills real data and
  drops the real JSON column. FR-16 met without any manual bookkeeping step.
- **Documented pre-flight check (FR-17, operator-facing, in `docs/architecture.md` +
  `AGENT.md`):** before running `db:migrate` against any environment with existing data,
  confirm `videos` and `app_settings` have the columns 0000 expects (a one-line
  `information_schema.columns` query, or simply: "if this environment has ever run
  `db:push` successfully, it's safe"). If that check fails (unexpected schema drift), do
  **not** run `db:migrate` — this is the "fail closed if baseline is not actually present"
  requirement; it's a pre-flight read-only check, not a bookkeeping edit.
- `docker-compose.yml`'s existing `db:push` startup step is left unchanged (FR-18,
  out-of-scope per design.md §11); documented caveat: a local volume with real profile data
  must be migrated via `pnpm run db:migrate` once, not relied on to survive `db:push`.

## 6. Data access transaction semantics

- `replaceChildProfiles` — one `db.transaction()`: delete-omitted → upsert-profiles →
  per-profile progress replace (delete-not-present + upsert-rest). Matches today's
  "whole PATCH succeeds or fails together" behavior; still a single admin-driven call, not a
  concurrency target (FR-20).
- `upsertVideoProgress` — one `db.transaction()`: EXISTS check (videoId in `videos`) →
  `onConflictDoUpdate` on `(profile_id, video_id)` → scoped cap-cleanup delete for that
  `profile_id`. The `onConflictDoUpdate` alone is what makes two concurrent POSTs for the
  *same* pair serialize on Postgres's own unique-index conflict handling (FR-25); different
  `videoId`s under the same profile touch different rows and never block each other (FR-26).
  The cap-cleanup step is scoped by `profile_id` only (index-assisted), so it cannot contend
  with another profile's writes.
- `clearVideoProgress` — single scoped `DELETE ... WHERE profile_id = $1 AND video_id = $2`,
  no transaction needed (one statement).
- `appendWatchHistory` — read-then-write on one `child_profiles` row (by `profileId`);
  explicitly **not** required to be atomic (spec §Non-goals, FR-31) — unchanged risk profile
  from today, just rescoped from the whole settings singleton to one profile row (side
  benefit: different profiles' history writes no longer contend at all).

## 7. Stale progress filtering (FR-36)

`replaceChildProfiles` filters each incoming profile's `videoProgress` array against the
video catalog **before** the per-profile progress-replace step: build a `Set<number>` of all
`videos.id` in one query up front (avoids N+1 — AGENTS.md perf rule), drop any entry whose
`videoId` is not in that set, then proceed with delete-not-present/upsert-rest against the
filtered list. The response's `childProfiles[].videoProgress` reflects the filtered list (the
stale entry is simply absent), and the request still returns success — never a 4xx for this
reason (FR-36, acceptance criteria §5 P2).

## 8. Key decisions & trade-offs

**D1 — Migration-safety mechanism: idempotent DDL, not manual journal bookkeeping.**
`design.md` §8 proposed documenting a manual step of marking migration `0000` as
"already-applied" in Drizzle's `__drizzle_migrations` table before the first real
`db:migrate` run. Per this task's explicit instruction ("do not prescribe fragile manual
insertion into Drizzle metadata unless validated") and after reading the actual migrator
source (`node_modules/drizzle-orm/pg-core/dialect.js`, §1), this plan replaces that step with
hand-editing 0000's two `CREATE TABLE` statements to `CREATE TABLE IF NOT EXISTS`. Trade-off:
this is a mechanical, standard-Postgres-semantics edit (no exotic behavior — `IF NOT EXISTS`
unconditionally skips on name collision, verified against Postgres docs/behavior, not
inferred) versus computing/inserting a correct `hash`+`created_at` row by hand, which is
easy to get subtly wrong (wrong hash → migrator's own consistency expectations aren't even
hash-checked per row, but a wrong `created_at` watermark could cause 0001/0002 to be skipped
too, or reapplied). **D1 wins**: no real DB write, nothing to get wrong, same outcome (FR-16).

**D2 — Split backfill into its own `--custom` file (0002) instead of folding it into
generated 0001.** Keeps 0001 a pure, regeneratable, human-reviewable DDL diff (if
`db/schema.ts` needs a follow-up tweak before this ships, `db:generate` can safely
regenerate 0001 without clobbering hand-written SQL). 0002 is explicitly hand-authored and
reviewed as such — matches FR-13 ("generated, reviewable SQL... not an ad-hoc one-off script
outside the normal migrate path": `--custom` migrations are a first-class drizzle-kit
mechanism, tracked in the same journal, run by the same `db:migrate`).

**D3 — Video-existence check via `EXISTS` query, not catching FK-violation errors.**
`upsertVideoProgress` checks before inserting rather than relying on the DB to reject and
catching that error. Matches AGENTS.md "handle expected errors explicitly" / API skill
guidance; also is exactly how the route satisfies FR-37's `200` silent-no-op shape (§4.2)
without leaking a raw constraint-violation error.

**D4 — Consolidate the three routes' duplicated `getOrCreateSettings()` into the existing
`lib/app-settings-server.ts` import while already editing these files.** In-scope
incidental cleanup (not a new abstraction, not unrelated-code refactoring) — the alternative
(leaving three more copies that now also need to drop the `childProfiles` field) is strictly
worse and touches the same lines anyway.

## 9. Testing strategy (FR-35, tsx only)

- **Pure-logic scripts** (`tsx`, no `DATABASE_URL` needed), one file per concern, run in CI-style
  gate alongside lint/build:
  - Cap-eviction ordering: given >50 synthetic progress rows with distinct `updatedAt`, assert
    the "keep most-recent 50" selection matches the SQL's `ORDER BY updated_at DESC LIMIT 50`
    logic (mirror the query's intent in JS against fixture data — this is not testing the
    DB, it's testing the ordering contract other code relies on).
  - DTO assembly shape: given profile rows + progress rows, assert
    `listChildProfiles`-equivalent grouping produces the exact nested `ChildProfile` shape
    (field names/types) the client expects.
  - Trackability: `isTrackableVideo` boundary (5-minute threshold) — likely already
    exists/extendable given the function predates this change.
  - Stale-progress filter (FR-36): given a profile-input payload with one `videoId` absent
    from a fixture catalog set, assert the filtered result omits only that entry and the
    function does not throw.
- **Optional, opt-in integration script** (`scripts/verify-video-progress-db.ts`, `tsx`,
  runs only when `process.env.DATABASE_URL` is set — skips with a clear message otherwise):
  against a real (local/dev) Postgres, exercise `upsertVideoProgress` with concurrent
  `Promise.all` calls for (a) the same `(profileId, videoId)` pair — assert exactly one row,
  latest write wins; (b) different `videoId`s under one profile — assert both rows exist,
  neither lost; (c) burst-write cap-50 cleanup — assert row count converges to ≤50 after a
  final write. Documented as a manual/local verification step, not part of the required
  `pnpm run lint && pnpm run build` gate (no `DATABASE_URL` guaranteed in CI/sandbox — per
  context brief §8, FR-35b).
- **Independent/parallelizable test units:** the pure-logic scripts have zero shared state
  and can be written/run independently of each other and of the DB-migration work; the opt-in
  DB script depends on the schema + server modules existing first.

## 10. Docs updates (FR-32–FR-34, no new structure)

- `docs/api.md` §Profiles: document `GET`/`POST /api/profiles/video-progress` (currently
  entirely undocumented — verified, only `watch-history` is mentioned today), note relational
  storage + unchanged JSON contracts for all four routes.
- `docs/architecture.md` §Data: replace the JSONB-blob bullet with `child_profiles` /
  `video_progress` table descriptions, FK/cascade behavior, the 0000/0001/0002 migration
  sequence, and the FR-15/16/18 environment-outcome + compose-caveat notes. §Testing: replace
  "No automated test suite is configured yet" with the two script types (§9).
- `docs/decisions/`: one new ADR file per the existing template — why JSON-embedded
  profiles/progress became exactly two tables + JSON `watchHistory` (FR-34), referencing the
  concurrency motivation (FR-25/26) and the "no third table" constraint.

## 11. Risks (no open questions — FR-37 resolved the one gap from the prior draft)

1. **`drizzle-kit generate`'s exact FK/index SQL syntax for `video_progress`** (inline
   `REFERENCES` in `CREATE TABLE` vs. separate `ALTER TABLE ... ADD CONSTRAINT`, and whether
   `--name` is supported in the installed `0.28.0` for naming 0000/0001 predictably) is
   confirmed only by actually running `db:generate` at implementation time — this plan does
   not run it (per instruction). This is normal implementation-time verification, not a
   blocker: whichever syntax `drizzle-kit` emits is generated DDL either way (§4.2/§5 don't
   depend on the exact spelling), and if `--name` is unsupported, implementation simply
   records drizzle-kit's auto-generated filenames rather than renaming files (renaming a
   migration `.sql` file requires also updating its `tag` in `meta/_journal.json`, or the
   migrator throws "No file found").
2. **D1's `IF NOT EXISTS` approach assumes 0000's column list exactly matches what `db:push`
   already created in every real environment.** True today (both are generated from the
   same `db/schema.ts` at the same pre-edit commit), but the FR-17 pre-flight check (§5) is
   the documented fallback if some environment has drifted — flagged as an operator
   responsibility, not solvable purely in the migration file.
3. **Cap-50 transient overshoot under burst concurrent writes** (FR-28) — accepted by spec,
   no mitigation needed beyond the next write's cleanup converging it.
4. **`appendWatchHistory`/watch-history route staying non-atomic** is explicitly a spec
   non-goal (FR-31) — flagged here only so implementation doesn't "improve" it out of scope.

## Self-review

- Every FR-1–FR-37 is addressed by §3–§10 above (storage shape §3, migration §5, concurrency
  §6, category integration §4.3, API compatibility §4.3, FR-37 stale-POST no-op §4.2/D3,
  docs/tests §9–§10).
- No contradictions with `design.md` except the explicitly-flagged, rationale-backed D1
  refinement (§8); everything else (table shapes, module split, cap logic, route mapping) is
  carried through unchanged.
- Independent/parallelizable units called out: `lib/child-profiles-server.ts` vs.
  `lib/video-progress-server.ts` (§2); the four pure-logic test scripts vs. the DB-migration
  authoring vs. the docs updates (§9–§10) can proceed in parallel once §3's schema is fixed.
- No unresolved placeholders or open questions remain. §11 lists normal implementation-time
  risks only (drizzle-kit syntax verification, environment drift, accepted cap overshoot,
  explicit non-goal), none of which block starting implementation.
