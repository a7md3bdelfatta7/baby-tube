# Spec: Relational Child Profiles & Video Progress

## 1. Overview

Today each child’s profile, watch history, and per-video resume progress live together inside a single JSON blob on the app settings row. Concurrent progress saves race on that whole row, category list updates mutate the same blob, and there is no referential cleanup when a profile or video is removed.

This change stores **exactly two** relational tables — `child_profiles` and `video_progress` — while keeping watch history as JSON on the profile (not a third table). Existing profile and progress data must survive a reviewable, all-or-nothing migration. Public profile/progress APIs keep their current request and response shapes. In-progress, uncommitted product work that already implements JSON-based video progress (resume/autosave) is the feature being relationalized, not discarded. Schema application for this change must never use declarative push (`db:push`).

## 2. Goals / Non-goals

### Goals

- Persist child profiles as rows in `child_profiles` and per-video progress as rows in `video_progress` only.
- Keep `watchHistory` as JSON on `child_profiles` (no third table).
- Preserve all existing profile rows, watch-history payloads, and progress entries that can legally attach to a known video.
- Keep public JSON contracts for profile list/replace, watch-history append, and video-progress get/upsert/clear unchanged.
- Make per-video progress upsert/clear atomic and scoped so concurrent saves for different videos do not overwrite each other.
- Enforce existing caps (profiles, history, progress, trackable duration) with equivalent observable behavior.
- Keep category rename/remove updating each profile’s preferred categories after the blob is gone.
- Document storage, APIs, and deployment acceptance; add tests without a new test framework.
- Leave unrelated uncommitted working-tree changes intact; build on the in-flight video-progress feature.

### Non-goals

- Profile identity authentication (watch-history and video-progress writes stay client-supplied `profileId`, unauthenticated by design).
- Making watch-history append atomic (only video-progress had an explicit concurrency requirement).
- A third table or FK/cascade for watch-history video ids (same orphan behavior as today when a video is deleted).
- Dual-write or zero-downtime phased cutover.
- Changing docker-compose / Dockerfile startup (including any existing declarative schema-push step).
- Introducing a new test runner dependency.
- Running `db:push` at any point in this change.
- Applying migrations to a real database as part of authoring this change unless the operator explicitly requests it.
- Reverting or rewriting the in-progress watch-page/player resume/autosave UX except as required to keep using the same public APIs against the new store.

## 3. User stories

**P1** — As a parent/admin, I want existing child profiles and their watch history to still be present after the storage change, so that no child setup or history is lost.

**P1** — As a child viewer (via the existing player), I want resume progress to save and load the same way as today, so that in-progress playback is not reset by the storage change.

**P1** — As an operator, I want applying the migration to either a fresh database or a database that already has today’s tables to succeed without destroying data, so that deploy is safe and never uses `db:push`.

**P1** — As a concurrent saver of progress, I want two saves for the same profile+video to end as one row with the later write winning, and saves for different videos under the same profile not to clobber each other.

**P2** — As an admin, I want replacing the full profile list (including nested progress) to behave as it does today, so that the admin profiles UI does not need a contract change.

**P2** — As an admin, I want renaming or removing a content category to still update every child’s preferred categories.

**P3** — As a developer, I want docs and lightweight tests that describe the new store, the unchanged APIs, and how to verify migration outcomes, so that later work does not reintroduce the JSON blob.

## 4. Functional requirements

### Storage shape

- **FR-1.** After the change, child identity and profile fields (name, birth date, screen-time settings, preferred categories, watch history) MUST be stored in table `child_profiles` only. The app settings row MUST NOT retain a `child_profiles` JSON column.
- **FR-2.** After the change, per-video progress MUST be stored only in table `video_progress`. There MUST NOT be a third table for watch history or progress.
- **FR-3.** `watchHistory` MUST remain JSON on `child_profiles`. Video deletion MUST NOT cascade-clean watch-history entries (same as today).
- **FR-4.** Profile `id` MUST remain a stable client-assigned string (not a database-generated integer), because it is stored in browser `localStorage` and sent as `profileId` on requests.
- **FR-5.** `video_progress` MUST uniquely identify one row per `(profile, video)` pair.
- **FR-6.** Deleting a child profile MUST remove that profile’s `video_progress` rows.
- **FR-7.** Deleting a video MUST remove `video_progress` rows for that video. Progress MUST NOT be stored for a video id that does not exist in the video catalog.
- **FR-8.** Listing progress by profile MUST be efficiently scoped to that profile (index on profile is required as an observable performance/correctness aid for cap cleanup and GET-by-profile).

### Migration & data preservation

- **FR-9.** Existing profile records in the JSON blob MUST appear as `child_profiles` rows with the same ids and field values (including watch history JSON).
- **FR-10.** Existing progress entries whose `videoId` still exists in the video catalog MUST appear as `video_progress` rows. Progress whose `videoId` no longer exists MUST be skipped (not fail the migration).
- **FR-11.** Backfill MUST be idempotent: re-applying the data copy MUST NOT duplicate profiles or progress rows.
- **FR-12.** Removal of the JSON source column and insertion of relational rows MUST be all-or-nothing: if any part of that migration unit fails, the JSON source MUST still be present and relational tables MUST NOT be left as the sole incomplete copy of production data.
- **FR-13.** The migration artifact MUST be generated, reviewable SQL (or equivalent checked-in migration files), not an ad-hoc one-off script that is not part of the normal migrate path.
- **FR-14.** This change MUST NOT be applied with `db:push`. Schema evolution for this change MUST go through generate + migrate.

### First-migration environments (outcome criteria only)

This repo has never used migration files; live databases already contain today’s tables from declarative push. The following are **acceptance outcomes**, not operator runbooks:

- **FR-15.** On an **empty** database, applying the full migration sequence MUST create today’s baseline tables and then the two new tables, backfill (no-op if no JSON data), and drop the JSON column, leaving a consistent schema.
- **FR-16.** On a database that **already has** today’s tables and data, applying the migration sequence MUST NOT attempt to recreate those existing tables in a way that fails (e.g. “relation already exists”) or wipes data. Only the relational delta (two tables, backfill, drop JSON column) MUST take effect.
- **FR-17.** Operators MUST be given documented, environment-level acceptance checks for FR-15 and FR-16 (fresh vs already-populated). The spec does **not** require a particular internal bookkeeping procedure (for example manually editing migrator bookkeeping rows). Any documented procedure MUST be safe, idempotent, and fail closed if the baseline is not actually present.
- **FR-18.** Docker Compose’s existing schema-push startup MAY remain unchanged. Docs MUST state that an existing local volume with real profile data is preserved only by running the migrate path, not by relying on compose push.

### API compatibility

- **FR-19.** `GET /api/profiles` MUST still return `{ childProfiles }` where each profile includes nested `watchHistory` and `videoProgress` arrays with the same field names and types as today.
- **FR-20.** `PATCH /api/profiles` MUST still require admin auth, accept the same full-array input (max 12 unique ids), and return `{ childProfiles }` with the same nested shape. Full replace MUST still delete profiles omitted from the payload (and their progress, via FR-6) and replace each included profile’s progress list to match the payload **after** FR-36.
- **FR-36.** `PATCH /api/profiles` MUST **silently omit** nested `videoProgress` entries whose `videoId` is not in the video catalog. The request MUST still succeed. All valid profile fields and all progress entries whose videos still exist MUST be applied. Omitted entries MUST NOT be stored (FR-7). This matches migration skip behavior (FR-10), preserves admin full-replace after a video was deleted, and MUST NOT reject the whole request.
- **FR-21.** `POST /api/profiles/watch-history` MUST remain unauthenticated by profile, append to that profile’s watch history (cap 100, newest-first), and return `{ childProfiles }` with the same nested shape.
- **FR-22.** `GET /api/profiles/video-progress?profileId=` MUST return `{ profileId, videoProgress }` as today, and MUST 404 if the profile does not exist.
- **FR-23.** `POST /api/profiles/video-progress` MUST keep the current body/response contract (upsert vs clear / non-trackable), remain unauthenticated by profile, and return `{ profileId, videoProgress }`.
- **FR-37.** `POST /api/profiles/video-progress` for a `videoId` that is not in the video catalog MUST be a **silent no-op**: do not insert or update; do not raise an FK/integrity error; preserve that profile’s current progress list unchanged. Response MUST be **200** with the same `{ profileId, videoProgress }` shape as a successful save, listing the unchanged rows. This matches FR-10 / FR-36 and keeps player autosave from failing after a video was deleted. Unknown `profileId` remains 404 (FR-22).
- **FR-24.** Client wrappers and UI that already consume those shapes MUST keep working without a versioned API break. Uncommitted resume/autosave work MUST continue to call the same progress endpoints.

### Concurrency & caps

- **FR-25.** Progress upsert for one `(profileId, videoId)` MUST be a single atomic write to that pair. Concurrent POSTs for the same pair MUST result in exactly one row; the last committed write’s position/total/updated time MUST win.
- **FR-26.** Concurrent POSTs for **different** `videoId`s under the same profile MUST NOT overwrite each other’s progress (today’s whole-blob rewrite MUST be gone).
- **FR-27.** Progress MUST be stored only when the video is trackable (`totalSeconds` greater than 5 minutes), matching current validation. Non-trackable or explicit clear MUST delete that pair’s row if present.
- **FR-28.** Each profile MUST have at most 50 progress rows, preferring the most recently updated. Transient overshoot under heavy concurrent writes to many distinct videos on one profile is acceptable if a subsequent write for that profile restores the cap; this is a housekeeping limit, not a security boundary.
- **FR-29.** At most 12 profiles and 100 watch-history entries per profile MUST still be enforced with the same validation/behavior as today. Watch-history writes for different profiles MUST NOT share a single settings-row contention point (they target one profile row).

### Category integration

- **FR-30.** Renaming or removing a content category MUST update `preferredCategories` on every `child_profiles` row. Behavior MUST NOT depend on the removed JSON blob.

### Working tree & docs/tests

- **FR-31.** Unrelated uncommitted files and the in-flight video-progress feature MUST not be reverted. The relational store MUST back that feature.
- **FR-32.** API docs MUST describe the previously undocumented video-progress GET/POST (shapes, unauthenticated-by-design) and note that storage is relational while JSON contracts are unchanged.
- **FR-33.** Architecture docs MUST describe the two tables, cascades, indexes, drop of the JSON column, and the FR-15/FR-16 deployment outcomes (including compose caveat FR-18).
- **FR-34.** An architecture decision record MUST record why JSON-embedded profiles/progress were replaced with exactly two tables and watch-history JSON.
- **FR-35.** Tests MUST use existing `tsx` (no new test framework). Include: (a) pure assertions for DTO assembly, cap-eviction ordering, and trackability; (b) an optional, opt-in DB script that runs only when `DATABASE_URL` is set and verifies FR-25, FR-26, and FR-28. Lint and build remain the required CI-style gate; generate of migration SQL is the schema-authoring gate. `db:push` and migrate-against-real-DB are not part of the default authoring gate.

## 5. Acceptance criteria

### P1 — Data and APIs survive

**Given** a settings JSON blob with N profiles (ids, names, history, progress)  
**When** the migration unit completes successfully  
**Then** `child_profiles` has those N ids and matching fields/history, `video_progress` has every progress entry whose video still exists, the JSON column is gone, and `GET /api/profiles` returns the same nested objects clients already use.

**Given** a JSON progress entry whose `videoId` is not in the catalog  
**When** migration runs  
**Then** that entry is omitted, migration still succeeds, and no progress row exists for a missing video.

**Given** the in-flight player resume/autosave flow  
**When** it GET/POSTs video-progress as today  
**Then** behavior matches the current contract (resume offer, autosave, clear) against relational rows.

### P1 — Environment classes

**Given** an empty database  
**When** the full migration sequence is applied  
**Then** baseline tables exist, `child_profiles` and `video_progress` exist with required uniqueness/cascades/indexes, and the JSON column is absent.

**Given** a database already populated by today’s schema  
**When** the migration sequence is applied per documented acceptance  
**Then** existing `videos` / settings / catalog data remain, no recreate-existing-table failure occurs, profiles/progress are backfilled, and the JSON column is dropped.

**Given** any apply path for this change  
**When** schema is updated  
**Then** `db:push` is not used.

### P1 — Concurrency

**Given** two concurrent POSTs for the same profile and video  
**When** both complete  
**Then** one `video_progress` row exists for that pair and matches the last committed payload.

**Given** two concurrent POSTs for the same profile and different videos  
**When** both complete  
**Then** both videos have independent rows; neither write is lost.

**Given** a known `profileId` and a `videoId` that is not in the catalog  
**When** `POST /api/profiles/video-progress` runs (upsert or clear)  
**Then** the status is 200, the body is `{ profileId, videoProgress }` with the pre-request list unchanged, and no row is created for the missing video.

### P2 — Admin replace and categories

**Given** PATCH with a subset of profile ids  
**When** the request succeeds  
**Then** omitted profiles (and their progress) are gone; included profiles’ nested progress matches the payload except for FR-36 omissions.

**Given** PATCH whose nested `videoProgress` includes at least one `videoId` that is no longer in the catalog, plus valid profiles and valid progress  
**When** the request is processed  
**Then** the response is success (not 4xx for those stale ids); missing-video progress is absent from storage and from the returned `videoProgress`; all valid profile updates and remaining progress are applied.

**Given** a category rename or delete  
**When** the category list update runs  
**Then** every child’s `preferredCategories` reflects rename or removal.

## 6. Edge cases & error handling

- Unknown `profileId` on progress GET/POST: 404 (existing).
- Invalid bodies: same validation errors as today’s Zod contracts (birth date, ranges, caps, trackable duration).
- Progress for a deleted video: cannot be inserted (FR-7); GET lists only remaining rows. POST for a missing `videoId`: silent no-op, 200, list unchanged (FR-37).
- Profile delete: progress gone (FR-6); watch history gone with the profile row.
- Migration failure mid-unit: JSON source still present (FR-12).
- Double migrate of backfill: no duplicate ids (FR-11).
- Cap 50 under burst writes: may briefly exceed, then converge (FR-28).
- Watch-history still last-write-wins on a single profile row (not specified as atomic).
- Admin PATCH that includes progress for a missing video: silently omit those entries (FR-36); do not fail the request; do not leave an orphan row (FR-7); apply every valid profile and remaining progress.

## 7. Non-functional requirements

- **Safety:** No `db:push`. No new secrets. Do not log credentials. Do not add profile auth.
- **Integrity:** Unique `(profile, video)`; cascades as in FR-6/FR-7; backfill skips illegal video ids.
- **Concurrency:** Atomic pair upsert (FR-25/FR-26).
- **Compatibility:** Nested JSON DTOs unchanged; `localStorage` profile ids still valid.
- **Authoring validation:** `pnpm run lint`, `pnpm run build`, and migration generation that produces reviewable SQL — not apply-to-prod unless asked.
- **Tests:** `tsx` only; DB checks opt-in via `DATABASE_URL`.
- **Preserve WIP:** Do not clobber unrelated uncommitted files.

## 8. Success metrics

- Exactly two new domain tables; watch history not a table; JSON blob column gone after successful migrate.
- Zero intended API consumer changes for nested `ChildProfile` / progress payloads.
- Concurrent same-key progress saves → one row; different-key saves → no lost updates.
- Existing environments migrate without table-recreate failure and without data loss (FR-16).
- Category updates still rewrite preferred categories on all children.
- Lint/build pass; `tsx` scripts cover mapping/caps/trackability; optional DB script documents FR-25/26/28.
- Working tree’s unrelated and video-progress WIP still present.

## 9. Open questions

None. Stale `videoId` skip is decided for migrate (FR-10), PATCH (FR-36), and POST progress (FR-37). Bootstrap remains outcome-only (FR-15–FR-17).

## Scope note

This delta is one plan: two tables, one migration unit, API compatibility, category update, docs/tests. Do not fold compose rewrite, profile auth, or watch-history normalization into the same plan.
