# Tasks: Relational Child Profiles & Video Progress

- **Feature dir:** `specs/001-relational-child-profiles-video-progress/`
- **Plan:** `plan.md` (Approach B + D1 `IF NOT EXISTS` baseline; do not use design.md §8 journal fakery)
- **Spec FRs:** FR-1–FR-37
- **Mode:** existing repo; first Drizzle migration files
- **Execution:** `tasks-20260904T121900Z`, 2026-09-04T12:19:00Z

## Standing constraints (every worker)

- **Do not commit.** Do not `git add`/`git commit`/`git push`.
- **Preserve all existing uncommitted / untracked WIP.** Build on the in-flight JSON video-progress feature (FR-31). Do not revert, restage, or rewrite unrelated edits (`AGENT.md`, `CLAUDE.md`, `AGENTS.md`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `app/watch/[id]/page.tsx`, `components/Player.tsx`, `components/admin/profiles.tsx`, `lib/api.ts`, `lib/validation.ts`, `lib/video-progress.ts`, `lib/config/video-progress.ts`, `app/api/profiles/video-progress/route.ts`, docs already in tree). Touch listed files only for the relational delta this task names.
- **Never run `pnpm run db:push`.** **Never run `pnpm run db:migrate` / `tsx db/migrate.ts` against a real database.** Authoring gate is generate + SQL review + lint/build only (FR-14, FR-35).
- Do not change public JSON contracts (FR-19–FR-24). Do not add profile auth. Do not edit `docker-compose.yml` (FR-18). Do not add a test framework.
- If `drizzle-kit generate --name` is unsupported on `^0.28.0`, keep kit-emitted filenames and journal `tag`s; do not rename `.sql` files without updating `drizzle/meta/_journal.json`.

---

## Setup / migrations

- [ ] T001 Generate **baseline** migration from **today’s unedited** `db/schema.ts` (must run **before** any schema edit). Run `pnpm run db:generate` once. Hand-edit the two `CREATE TABLE` statements to `CREATE TABLE IF NOT EXISTS "videos"` and `CREATE TABLE IF NOT EXISTS "app_settings"` (D1; FR-15, FR-16). Do not add new tables here. Do not `db:push`. Do not `db:migrate`. — files: `drizzle/` (new: `0000_*.sql`, `meta/_journal.json`, `meta/*_snapshot.json`); `db/schema.ts` (**read-only**) — depends on: (none)

- [ ] T002 Edit Drizzle schema: add `childProfiles` / `videoProgress` tables exactly as `plan.md` §3.1 (text PK `id`, JSON `watchHistory`, serial progress PK, FKs `ON DELETE CASCADE` to profile + `videos`, unique `(profile_id, video_id)`, index `video_progress_profile_id_idx`). Remove `appSettings.childProfiles` JSONB column. Keep API DTO type `ChildProfile` (nested `videoProgress` / `watchHistory`) as a plain type, not `$inferSelect`. Add `ChildProfileRow` / `VideoProgressRow`. (FR-1–FR-8) — files: `db/schema.ts` — depends on: T001

- [ ] T003 [P] Generate **delta** DDL from the **edited** schema. Run `pnpm run db:generate` (second time). Expect `CREATE TABLE "child_profiles"` / `CREATE TABLE "video_progress"` + FKs/indexes. **No** `IF NOT EXISTS` hand-edit on these new tables. Do not fold backfill into this file (D2). Do not `db:push` / `db:migrate`. Record actual filenames if kit auto-names them. (FR-13) — files: `drizzle/` (`0001_*.sql`, updated `meta/_journal.json`, new snapshot) — depends on: T002

- [ ] T004 Author **custom** backfill + drop via `drizzle-kit generate --custom` (journal entry after 0001). Hand-write SQL per `plan.md` §5: (1) `INSERT INTO child_profiles … jsonb_array_elements` + `COALESCE` defaults + `ON CONFLICT (id) DO NOTHING`; (2) `INSERT INTO video_progress …` with `WHERE EXISTS` on `videos.id` + `ON CONFLICT (profile_id, video_id) DO NOTHING`; (3) `ALTER TABLE app_settings DROP COLUMN IF EXISTS child_profiles`. Use `--> statement-breakpoint` between statements. Confirm column names against T002. (FR-9–FR-14) — files: `drizzle/` (`0002_*.sql`, `meta/_journal.json`) — depends on: T003

## Server modules

Export small **pure** helpers from these modules (DTO assemble, stale-progress filter, cap-keep-id selection) so tsx scripts can import them without a DB. Reuse `lib/video-progress.ts` `isTrackableVideo` as-is. Import `getOrCreateSettings` from `lib/app-settings-server.ts` only in routes (D4), not a fourth local copy.

- [ ] T005 [P] Implement `lib/child-profiles-server.ts`: `listChildProfiles` (join/group progress, `createdAt ASC`); `replaceChildProfiles` in one `db.transaction()` (delete omitted profiles → upsert profiles → per-profile progress replace); filter stale `videoId`s via one catalog `Set` query before progress write (FR-36); `appendWatchHistory` (cap 100, newest-first, `null` if missing); `profileExists`. (FR-1–FR-4, FR-6, FR-19–FR-21, FR-29, FR-36) — files: `lib/child-profiles-server.ts` (new) — depends on: T002

- [ ] T006 [P] Implement `lib/video-progress-server.ts`: `getVideoProgress` (`updatedAt DESC`); `upsertVideoProgress` in one `db.transaction()` — `EXISTS` on `videos` **before** insert (FR-37 silent no-op: return current list, no FK error); `onConflictDoUpdate` on `(profileId, videoId)`; same-tx cap-50 delete (`ORDER BY updated_at DESC LIMIT 50`, scoped by `profile_id`); `clearVideoProgress` single scoped delete; `null` if profile missing. Non-trackable handled by caller via `isTrackableVideo`. (FR-5, FR-7, FR-8, FR-22, FR-23, FR-25–FR-28, FR-37) — files: `lib/video-progress-server.ts` (new) — depends on: T002

- [ ] T007 [P] Rewrite `applyCategoryListUpdate` to `select`/`update` `child_profiles.preferredCategories` per row (rename/strip). Stop mapping `settings.childProfiles` and stop writing `childProfiles` on `app_settings`. (FR-30) — files: `lib/categories-server.ts` — depends on: T002

## Routes (thin wrappers; same JSON shapes)

Remove each file’s duplicated local `getOrCreateSettings`; import `lib/app-settings-server.ts` where settings are still needed. No raw Drizzle in handlers after this wave.

- [ ] T008 [P] `GET/PATCH /api/profiles`: `listChildProfiles` / `replaceChildProfiles`; keep admin auth + `createProfilesInput`; respond `{ childProfiles }`. (FR-19, FR-20, FR-36) — files: `app/api/profiles/route.ts` — depends on: T005

- [ ] T009 [P] `POST /api/profiles/watch-history`: `appendWatchHistory`; 404 if `null`; respond `{ childProfiles }` (reload via list helper). Unauthenticated by profile. (FR-21, FR-29, FR-31 non-atomic OK) — files: `app/api/profiles/watch-history/route.ts` — depends on: T005

- [ ] T010 [P] `GET/POST /api/profiles/video-progress`: `profileExists` 404; GET `getVideoProgress`; POST upsert vs clear/non-trackable; unknown `videoId` → 200 silent no-op with unchanged list (FR-37). Shape `{ profileId, videoProgress }`. Do not change `lib/api.ts` client wrappers. (FR-22–FR-24, FR-27, FR-37) — files: `app/api/profiles/video-progress/route.ts` — depends on: T005, T006

## Tests (tsx only; one scenario per file)

- [ ] T011 [P] Pure script: cap-eviction ordering — fixture >50 rows, assert keep-most-recent-50 matches SQL intent. (FR-28, FR-35a) — files: `scripts/assert-progress-cap-order.ts` (new) — depends on: T006

- [ ] T012 [P] Pure script: DTO assembly — profile rows + progress rows → nested `ChildProfile` field names/types clients expect. (FR-19, FR-35a) — files: `scripts/assert-child-profile-dto.ts` (new) — depends on: T005

- [ ] T013 [P] Pure script: `isTrackableVideo` 5-minute boundary (existing helper). (FR-27, FR-35a) — files: `scripts/assert-trackable-video.ts` (new) — depends on: (none; reuse `lib/video-progress.ts`)

- [ ] T014 [P] Pure script: stale-progress filter — one missing `videoId` omitted, no throw, rest kept. (FR-36, FR-35a) — files: `scripts/assert-stale-progress-filter.ts` (new) — depends on: T005

- [ ] T015 [P] Opt-in DB script: skip with clear message if `DATABASE_URL` unset; if set, `Promise.all` same-pair (one row, last write wins), different `videoId`s (both kept), cap-50 burst (≤50 after final write). **Do not run this against prod; do not use it to apply migrations.** (FR-25, FR-26, FR-28, FR-35b) — files: `scripts/verify-video-progress-db.ts` (new) — depends on: T006

## Docs

- [ ] T016 [P] Document `GET`/`POST /api/profiles/video-progress` (shapes, unauthenticated-by-design) and note relational storage + unchanged JSON for all four profile routes. (FR-32) — files: `docs/api.md` — depends on: (none)

- [ ] T017 [P] Replace JSONB-blob data model with `child_profiles` / `video_progress`, FKs/cascades/indexes, 0000/0001/0002 sequence, FR-15/16/18 outcomes + compose `db:push` caveat, FR-17 pre-flight (`information_schema` / “safe if `db:push` already succeeded”; fail closed on drift). Update §Testing: tsx scripts vs opt-in DB script; lint/build/generate gate; **no `db:push` / no migrate-as-authoring**. (FR-17, FR-18, FR-33, FR-35) — files: `docs/architecture.md` — depends on: (none)

- [ ] T018 [P] ADR: why JSON blob → exactly two tables + JSON `watchHistory` (concurrency FR-25/26; no third table). Use `docs/decisions/README.md` template. (FR-34) — files: `docs/decisions/001-relational-child-profiles.md` (new) — depends on: (none)

- [ ] T019 [P] Operator notes only: `db:migrate` (not `db:push`) for this change; FR-17 pre-flight; compose caveat for volumes with real profile data. **Preserve all existing uncommitted `AGENT.md` edits; additive only.** (FR-14, FR-17, FR-18, FR-31) — files: `AGENT.md` — depends on: (none)

## Polish / gates

- [ ] T020 Review generated + custom SQL in `drizzle/` (0000 `IF NOT EXISTS`; 0001 FKs/unique/index; 0002 casts, `EXISTS` skip, `ON CONFLICT DO NOTHING`, drop column). Fix SQL/journal only if review finds errors. **Do not apply.** (FR-11–FR-16) — files: `drizzle/**` — depends on: T004

- [ ] T021 Run `pnpm run lint` and `pnpm run build`. Run tsx assertion scripts T011–T014. Do **not** run `db:push`. Do **not** run `db:migrate`. `db:generate` already done in T001/T003/T004 — do not regenerate in a way that clobbers 0002. (FR-35) — files: (validation only; no extra sources) — depends on: T007, T008, T009, T010, T011, T012, T013, T014, T016, T017, T018, T019, T020

- [ ] T022 Confirm authoring constraints: working tree still contains prior WIP; no commit created; no `db:push` / migrate applied. If `AppSettings` shrinkage missed a `childProfiles` column write, fix the named server/route file only. (FR-14, FR-31) — files: git working tree (read-only verify); fix only files already in this list if build fails — depends on: T021

---

## Parallel execution groups

```
Wave 1 (sequential): T001 -> T002
Wave 2 (parallel, after Wave 1): T003, T005, T006, T007, T013, T016, T017, T018, T019
Wave 3 (sequential after T003): T004 -> T020
Wave 4 (parallel, after T005/T006): T008, T009, T010, T011, T012, T014, T015
Wave 5 (sequential): T021 -> T022
```

Max parallel width: **8** (Wave 2). Same-file writers never share a `[P]` in one wave (`db/schema.ts` only T002; `drizzle/` T001 then T003 then T004 then T020; each route/module/doc its own file).

---

## FR coverage

| FRs | Tasks |
|-----|--------|
| FR-1–FR-8 storage | T002, T005, T006 |
| FR-9–FR-18 migration/envs/docs | T001, T003, T004, T017, T019, T020 |
| FR-19–FR-24, FR-36, FR-37 APIs | T005, T006, T008, T009, T010, T016 |
| FR-25–FR-29 concurrency/caps | T005, T006, T011, T015 |
| FR-30 categories | T007 |
| FR-31 WIP | standing constraints, T019, T022 |
| FR-32–FR-35 docs/tests/gates | T011–T018, T021 |

Out of scope (no tasks): compose/Dockerfile rewrite, profile auth, watch-history table, dual-write, applying migrations, `db:push`.
