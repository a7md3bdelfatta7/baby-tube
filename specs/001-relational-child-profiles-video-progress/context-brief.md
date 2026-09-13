# Context Brief: Relational Child Profiles & Video Progress

## 1. Change request (restated)

Replace the single `app_settings.child_profiles` JSONB blob with two normalized Postgres/Drizzle tables — `child_profiles` and `video_progress` — while keeping `watchHistory` as a JSON column on `child_profiles` (no third table). Existing rows must be preserved via a generated, reviewable migration + backfill (not `db:push`). New relational CRUD for profiles and a scoped, atomic, concurrency-safe upsert/delete for per-video progress must replace the current read-whole-row/mutate-array-in-JS/write-whole-row pattern, with FK cascades and indexes. Docs and tests must be added/updated. Unrelated uncommitted changes in the working tree must be preserved untouched.

## 2. Stack & runtime

- Next.js **16.2.4** App Router, TypeScript, React 18. `pnpm` package manager (lockfile present).
- Drizzle ORM `^0.36.0` + `drizzle-kit ^0.28.0`, `postgres` (postgres-js) driver. Dialect: `postgresql` (`drizzle.config.ts`: schema `./db/schema.ts`, out `./drizzle`).
- **No `drizzle/` migrations folder exists in the repo yet** (confirmed via `find`/git log) — this project has only ever used `pnpm run db:push` (declarative sync). `db:generate` and `db:migrate` (`tsx db/migrate.ts` → `drizzle-orm/postgres-js/migrator`) scripts exist in `package.json` but have never been exercised. This is the **first** migration-file-based change in the repo's history.
- No test runner is configured (`docs/architecture.md`: "No automated test suite is configured yet"; no jest/vitest in `devDependencies`, no `*.test.ts`/`*.spec.ts` files found). `tsx` is available as a devDependency, usable for lightweight script-based checks.
- Validation commands (per `AGENT.md`/`AGENTS.md`): `pnpm run lint`, `pnpm run build`; run `pnpm run db:push` only when schema changes — **but this task explicitly forbids running `db:push`**, so validation of the schema change must rely on `pnpm run db:generate` (to produce SQL) plus lint/build/typecheck, not an applied push.

## 3. Relevant architecture

- `db/schema.ts` — single source of Drizzle schema. Current `appSettings` table (`id` fixed at `1`, singleton row) holds `childProfiles: jsonb().$type<ChildProfile[]>()`. `ChildProfile` type embeds `watchHistory: WatchHistoryEntry[]` and `videoProgress: VideoProgressEntry[]` inline — these are **plain TS types, not tables**.
- `db/index.ts` — lazy Proxy-wrapped Drizzle `db` singleton (avoids throwing when `DATABASE_URL` unset). `db/migrate.ts` — runs `drizzle-orm` migrator against `./drizzle` folder; separate from `db:push`.
- `lib/app-settings-server.ts` — `getOrCreateSettings()` (canonical singleton-row getter, insert-with-onConflictDoNothing pattern) and `appendVideoIdsToQueue()`. **Not reused** by the profile-related routes below (see §9 conflict).
- Three route handlers under `app/api/profiles/` each **duplicate** their own local `getOrCreateSettings()` and do read-full-row → mutate JS array → write-full-row:
  - `app/api/profiles/route.ts` — `GET` (public, returns `{childProfiles}}`), `PATCH` (admin, full-array replace via `createProfilesInput`).
  - `app/api/profiles/watch-history/route.ts` — `POST` (public/unauthenticated by profile — no admin check), appends to `profile.watchHistory`, caps at `MAX_HISTORY_ITEMS = 100`.
  - `app/api/profiles/video-progress/route.ts` — `GET` (by `?profileId=`), `POST` (upsert-or-clear one entry keyed by `videoId`, caps at `MAX_PROGRESS_ITEMS = 50`, drops entries when `totalSeconds` is not "trackable"). This is the route with the concurrency risk: two concurrent `POST`s for the same profile race on the same JSONB row (no per-row locking / atomic SQL upsert).
- `lib/categories-server.ts` — `applyCategoryListUpdate()` also reaches into `settings.childProfiles[].preferredCategories` directly (rename/strip categories) — another JSON-array mutation path that must keep working against the new relational model.
- Client contract consumers of the nested `ChildProfile` shape (must **not** change their expected JSON shape unless intentionally versioned): `app/page.tsx`, `app/watch/[id]/page.tsx`, `components/WatchTimer.tsx`, `components/admin/dashboard.tsx`, `components/admin/profiles.tsx`, `lib/profiles.ts` (`useActiveChildProfile`, `filterVideosForProfile`). All call `getProfiles()` from `lib/api.ts` and destructure `profile.watchHistory` / `profile.videoProgress` / `profile.screenTimeMinutes` etc. as nested arrays on one object — the API response shape is a strong compatibility constraint.
- `lib/video-progress.ts` — pure helper functions (`isTrackableVideo`, `getSavedVideoProgress`, `shouldOfferResume`) operating on plain arrays; independent of storage layer, reusable as-is.
- `lib/config/video-progress.ts` — `VIDEO_PROGRESS_SAVE_INTERVAL_MS` client polling interval constant; unrelated to DB layer.
- `components/Player.tsx` + `app/watch/[id]/page.tsx` — **uncommitted, in-progress feature** (see §9): client-side resume/autosave using `saveVideoProgress()` (`lib/api.ts`) which calls `POST /api/profiles/video-progress`. This is the primary write path that needs atomic per-video upsert semantics once relational.

## 4. Conventions to follow

- Singleton-settings-row getter pattern: `getOrCreateSettings()` in `lib/app-settings-server.ts` (select → insert-onConflictDoNothing → re-select fallback). Follow this same three-step pattern for any new "get-or-create" need, and prefer **importing** the existing helper over re-duplicating it (existing routes duplicate it — do not add a fourth copy).
- Server-side domain logic lives in `lib/*-server.ts` modules (`app-settings-server.ts`, `categories-server.ts`); route handlers stay thin — validate → call lib function → respond. New profile/progress data-access logic should follow this split (e.g. a `lib/child-profiles-server.ts` / `lib/video-progress-server.ts`-style module), matching `AGENTS.md` "Keep API/data-access logic separate from presentation" and "Architecture" rules.
- Validation schemas centralized in `lib/validation.ts` using Zod factory functions parameterized by `allowed` categories (e.g. `createChildProfileInput(allowed)`, `createProfilesRead(allowed)`). Reuse this factory pattern; do not inline ad-hoc zod schemas in routes.
- Two schema variants per entity: a strict **input** schema (write path) and a lenient **read** schema (`createChildProfileRead` defaults `birthDate` for legacy rows) — preserve this "lenient read / strict write" split for backward compatibility during/after migration.
- Upsert-by-id pattern for the singleton row already uses `.insert(...).onConflictDoUpdate({ target, set })` (`app/api/profiles/route.ts`, `lib/app-settings-server.ts`, `lib/categories-server.ts`) — the natural Drizzle idiom to reuse for the new `video_progress` atomic upsert (`onConflictDoUpdate` on a unique `(profile_id, video_id)` constraint) instead of read-modify-write JS array manipulation.
- `db/schema.ts` is the single schema source; update it first, per `AGENT.md`, then run the appropriate Drizzle command — but per this task's constraint, the "appropriate command" here is `db:generate` (never `db:push`).
- Named exports, explicit return types, functional components — enforced repo-wide (`AGENTS.md`, user rules).

## 5. Data model touchpoints

Current (`db/schema.ts`):
- `appSettings` (singleton, `id=1`): `screenTimeMinutes`, `queueVideoIds: jsonb<number[]>`, `childProfiles: jsonb<ChildProfile[]>`, `contentCategories: jsonb<string[]>`.
- `ChildProfile` (TS type only, embedded in JSONB): `id: string` (client-generated via `createProfileId()` in `lib/profiles.ts` — `crypto.randomUUID()` or `profile-<timestamp36>` fallback; **must remain a stable string, not become a serial int**, since it's stored in `localStorage` (`babytube.active-profile.v1`) and passed as `profileId` in API bodies/query params), `name`, `birthDate` (YYYY-MM-DD string, validated `lib/age.ts` `isValidBirthDate`), `screenTimeMinutes` (1–180), `screenTimeResetHours` (1–168), `preferredCategories: string[]`, `watchHistory: WatchHistoryEntry[]` (cap 100, newest-first), `videoProgress: VideoProgressEntry[]` (cap 50, newest-first, unique per `videoId`).
- `WatchHistoryEntry`: `videoId`, `title`, `watchedAt` (ISO datetime), `status: "completed"|"skipped"`, `watchedSeconds`. **Stays as JSONB on `child_profiles`** per the change request (no third table).
- `VideoProgressEntry`: `videoId`, `positionSeconds`, `totalSeconds`, `updatedAt` (ISO datetime). **Becomes the new `video_progress` table**, one row per `(profileId, videoId)` pair.
- Validation caps to preserve: profiles per settings row ≤ 12 (`createProfilesInput` `.max(12)` + `dedupeProfiles` by `id`); `watchHistory` ≤ 100 entries; `videoProgress` ≤ 50 entries; progress only tracked when `totalSeconds > 5*60` (`MIN_TRACKING_DURATION_SECONDS`, `lib/video-progress.ts` / `videoProgressInput` refine in `lib/validation.ts`).
- `videos.id` (serial) is the FK target for `video_progress.video_id` if a FK to `videos` is added (current JSON model has no referential integrity to `videos` at all — deleting a video today leaves orphaned progress/history entries silently).

## 6. Integration & extension points

- New tables belong in `db/schema.ts` next to `appSettings`/`videos`. `child_profiles` needs no FK to `appSettings` (profiles are not truly owned by the settings singleton in practice — they're app-global); `video_progress.profile_id` FK → `child_profiles.id` **ON DELETE CASCADE** is the natural cascade (removes progress when a profile is deleted). A FK `video_progress.video_id` → `videos.id` is worth deciding explicitly (`ON DELETE CASCADE` vs `SET NULL` vs none) — not currently enforced, add deliberately.
- Unique constraint/index on `video_progress (profile_id, video_id)` is required both for the cap-50 accounting and to make the upsert atomic via `onConflictDoUpdate`. Index on `video_progress.profile_id` alone speeds the scoped `GET ?profileId=` query.
- Route handlers to rewrite: all three files under `app/api/profiles/` (`route.ts`, `watch-history/route.ts`, `video-progress/route.ts`) — swap their JSON read-modify-write bodies for relational queries while **preserving external request/response JSON shapes** listed in `docs/api.md` §Profiles and consumed by `lib/api.ts` (`getProfiles`, `updateProfiles`, `recordWatchHistory`, `saveVideoProgress`).
- `lib/categories-server.ts` `applyCategoryListUpdate()` must be updated to rename/strip `preferredCategories` on the new `child_profiles` table instead of walking `settings.childProfiles`.
- New server-side data-access module(s) are the natural seam: e.g. `lib/child-profiles-server.ts` (profile CRUD + assembling the aggregate `ChildProfile` shape by joining `video_progress`) and reuse of `lib/video-progress.ts` pure helpers for cap/trackability logic, called from the route or from a new `lib/video-progress-server.ts`.
- Migration generation seam: `pnpm run db:generate` against the updated `db/schema.ts` produces the DDL diff into `./drizzle/` (new to this repo). The **backfill** (copying existing `app_settings.child_profiles` JSONB rows into the two new tables, then dropping the old column) is data-migration logic that `drizzle-kit generate` will not author automatically — it must be hand-written as a custom SQL migration step (drizzle-kit supports a `--custom` empty migration file for this) inserted into the same/adjacent migration in the generated sequence, applied via `pnpm run db:migrate` (never `db:push`).

## 7. Constraints & invariants (do not break)

- **Never run `pnpm run db:push`** for this change — explicit user instruction. Use `db:generate` (+ hand-authored backfill SQL) and `db:migrate` instead.
- **Preserve unrelated uncommitted changes** in the working tree (`git status`/diff shows in-flight edits to `AGENT.md`, `CLAUDE.md`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, and the **video-progress feature itself** which is mid-implementation and uncommitted across `db/schema.ts`, `app/watch/[id]/page.tsx`, `components/Player.tsx`, `components/admin/profiles.tsx`, `lib/api.ts`, `lib/validation.ts`, plus new untracked `app/api/profiles/video-progress/route.ts`, `lib/video-progress.ts`, `lib/config/video-progress.ts`). This relational migration must **build on top of** that in-progress work, not revert or clobber it — the JSON `videoProgress` field and its resume/autosave UI flow are the feature being relationalized, not something to discard.
- Do not change the public JSON response shape of `GET/PATCH /api/profiles`, `POST /api/profiles/watch-history`, `GET/POST /api/profiles/video-progress` unless the task explicitly requires a contract change — many client call sites destructure the nested `ChildProfile` shape directly (§3).
- Keep `child_profiles.id` as a stable client-assigned string (uuid-ish), not a DB-generated serial — it's persisted in browser `localStorage` and referenced across sessions/requests.
- Keep existing caps: ≤12 profiles, ≤100 watch-history entries, ≤50 progress entries, progress only for videos >5min — enforce equivalently at the relational layer (app-level on insert, and/or DB constraints).
- No profile authentication exists and none is requested — `watch-history` and `video-progress` POST routes are intentionally unauthenticated by profile identity (client-supplied `profileId`); admin auth (`x-admin-password`) still gates `PATCH /api/profiles`. Do not add profile auth as part of this change.
- Never expose `ADMIN_PASSWORD`/`YOUTUBE_API_KEY`/`DATABASE_URL` details; no new secrets should be introduced.
- Concurrency safety requirement is explicit: the current `video-progress` POST is a read-whole-settings-row → mutate-JS-array → write-whole-row race; the relational replacement must use a single atomic SQL statement (`INSERT ... ON CONFLICT (profile_id, video_id) DO UPDATE`) scoped to one `(profile, video)` row, not a full-table/full-row rewrite.

## 8. Tests & verification

- No test runner exists yet; introducing one (if needed for the "tests" deliverable) is a real scope decision — `AGENTS.md` says "do not introduce a new dependency unless the existing project cannot reasonably solve the problem." `tsx` (already a devDependency) can run plain Node/TS assertion scripts without adding a framework; alternatively vitest/jest would be a new dependency. **`[NEEDS CLARIFICATION: which test approach — tsx-based scripts vs. introducing vitest — should the plan/spec phase decide?]`**
- Minimum validation gate per `AGENT.md`/`AGENTS.md`: `pnpm run lint`, `pnpm run build`, plus `pnpm run db:generate` to confirm the migration compiles/generates cleanly (no `db:push`, no migrate against a real DB unless the user explicitly asks).
- `docs/architecture.md` §Testing should be updated once a suite exists ("No automated test suite is configured yet" will become stale).
- Manual/integration check path if a DB is available locally: `docker compose up` uses Postgres 16 + currently runs `db:push` in its compose flow (per `AGENT.md` "Docker flow") — that compose behavior itself may need attention since this task forbids `db:push`; flag rather than silently change compose. `[NEEDS CLARIFICATION: should docker-compose's db:push step be swapped for db:migrate as part of this change, given the new migration files?]`

## 9. Risks, unknowns & doc/code conflicts

- **No prior migrations exist** (`drizzle/` absent, never committed) — this is the first schema change to go through `db:generate`/`db:migrate` rather than `db:push`. There's no established convention in-repo for authoring a custom backfill migration; it must be created following Drizzle's standard migration-file format (SQL file + `meta/_journal.json` entry), most reliably via `drizzle-kit generate --custom` for the hand-written backfill portion.
- **Route handlers duplicate `getOrCreateSettings()`** instead of importing `lib/app-settings-server.ts`'s version — pre-existing inconsistency, not introduced by this task, but the relational rewrite is a natural point to consolidate (or explicitly leave as-is if out of scope).
- **Uncommitted video-progress feature is unfinished/unmerged** — the JSON-based `video_progress` write path is mid-flight (see git status). Doc says `docs/api.md` doesn't yet mention `POST/GET /api/profiles/video-progress` at all (only `watch-history` is documented) — the docs deliverable must add it, ideally already accounting for the relational shape rather than documenting the soon-to-be-replaced JSON version.
- **`applyCategoryListUpdate` in `lib/categories-server.ts`** walks `settings.childProfiles[].preferredCategories` directly — must be rewritten against `child_profiles` rows; missing this would silently break category rename/deletion for profiles after migration.
- **FK design for `video_progress.video_id` → `videos.id`** is undecided in current code (no referential integrity today) — needs an explicit decision (cascade vs. nullify vs. none) during spec/plan, since "FK cascades/indexes" is explicitly requested but the exact cascade behavior for orphaned progress when a video is deleted isn't specified by the user.
- **Docker compose runs `db:push` automatically** (per `AGENT.md`) — conflicts with "never run db:push" if compose is exercised during this work; treat compose as out of scope unless the user asks to update it.
- Doc/code conflict already flagged in `AGENT.md` itself: README says Next.js 15 but `package.json`/`AGENT.md` correctly say 16.2.4 — unrelated to this change, no action needed.

## 10. Reuse map

| Existing asset | Path | Why reuse |
|---|---|---|
| Singleton settings getter pattern | `lib/app-settings-server.ts` (`getOrCreateSettings`) | Canonical select→insert-onConflictDoNothing→re-select idiom; mirror for any new getter, and prefer importing it in the profile routes instead of re-duplicating |
| Zod validation factory pattern | `lib/validation.ts` (`createChildProfileInput`/`createChildProfileRead`, `videoProgressInput`, `videoProgressQuery`) | Already encodes all the caps/limits (birthDate, category allow-list, 1–180/1–168 ranges, progress-only->5min rule) — adapt in place rather than re-deriving rules |
| Pure progress helpers | `lib/video-progress.ts` (`isTrackableVideo`, `getSavedVideoProgress`, `shouldOfferResume`) | Storage-agnostic; keep as-is, call from new server module |
| Profile id generation & active-profile client state | `lib/profiles.ts` (`createProfileId`, `useActiveChildProfile`, `filterVideosForProfile`) | Already the sanctioned client-side identity source; do not duplicate |
| Drizzle upsert idiom | `onConflictDoUpdate` usages in `app/api/profiles/route.ts`, `lib/app-settings-server.ts`, `lib/categories-server.ts` | Template for the new atomic `video_progress` upsert on a unique `(profile_id, video_id)` key |
| Client API wrapper conventions | `lib/api.ts` (`getProfiles`, `updateProfiles`, `recordWatchHistory`, `saveVideoProgress`) | Keep these signatures stable; only their server-side implementation backing changes |
| Docs structure | `docs/api.md` (§Profiles), `docs/architecture.md` (§Data), `docs/decisions/README.md` (ADR template) | Add `video_progress`/`child_profiles` sections and an ADR for the JSON→relational decision, matching existing format rather than inventing new doc structure |
