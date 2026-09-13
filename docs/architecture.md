# Architecture

## Overview

Baby Tube is a curated YouTube video player for children. Parents manage a video library, optional watch queue, child profiles, and screen-time settings through an admin area. Children browse categories on the home page and watch videos with clip enforcement and a configurable screen-time timer.

## Frontend

- **Framework:** Next.js App Router (see `package.json` for the pinned version), TypeScript, React 18.
- **Rendering:** Server Components where possible; Client Components for interactive admin UI, YouTube playback, and timer state.
- **Component structure:**
  - `app/` — pages and route handlers.
  - `components/` — shared UI, player, admin panels.
  - `components/admin/` — admin-specific views (library, queue, profiles, settings).
  - `components/ui/` — shadcn-style primitives.
- **State management:**
  - TanStack Query for server state and mutation cache invalidation in admin UI.
  - `lib/timer-store.ts` for persisted watch-timer state.
  - Local storage for admin password (`babytube.admin.pw`).
- **Data fetching:** Client helpers in `lib/api.ts`; server reads in route handlers and page components.
- **Styling:** Tailwind CSS, `cn` helper from `lib/utils.ts`, brand assets under `public/brand/`.

## Backend

- **API architecture:** Next.js Route Handlers under `app/api/`.
- **Services:** Domain logic in `lib/` modules (`youtube.ts`, `queue.ts`, `profiles.ts`, `categories-server.ts`, `app-settings-server.ts`).
- **Data access:** Drizzle ORM via lazy proxy in `db/index.ts`; schema in `db/schema.ts`.
- **Authentication:** Shared password compared in `lib/auth.ts` via `x-admin-password` header. No user sessions.
- **Authorization:** Mutating routes call `isAuthorized(req)`; public reads on video list and queue.

## Data

- **Database:** Postgres (local Docker or Neon in production).
- **Main entities:**
  - `videos` — curated YouTube entries with categories, clip bounds, and sort position.
  - `app_settings` — screen time default, queue video IDs, content categories (single-row table, `id = 1`).
  - `child_profiles` — one row per child profile (`id` is a client-generated string, e.g. `crypto.randomUUID()`, never a serial int — it's persisted in browser `localStorage` and referenced across requests). Holds `name`, `birthDate`, `screenTimeMinutes`, `screenTimeResetHours`, `preferredCategories` (JSONB), and `watchHistory` (JSONB, capped at 100 entries, newest first) — `watchHistory` stays JSON on the profile row by design; it is not a third table.
  - `video_progress` — one row per `(profileId, videoId)` pair. `profile_id` FK → `child_profiles.id` `ON DELETE CASCADE`; `video_id` FK → `videos.id` `ON DELETE CASCADE`. Unique index on `(profile_id, video_id)` (upsert target + cap accounting); index on `profile_id` (scoped reads/cleanup). Capped at 50 rows per profile (oldest by `updated_at` evicted).
- **Migrations:** Drizzle Kit — `pnpm run db:push` for dev/declarative sync. This repo's first migration-file-based change (relational child profiles + video progress) shipped as three files under `drizzle/`:
  - `0000_*.sql` — generated baseline snapshot, hand-edited to use `CREATE TABLE IF NOT EXISTS` for `videos` / `app_settings`. It no-ops when those tables already exist.
  - `0001_*.sql` — generated DDL adding `child_profiles` / `video_progress` (new tables, FKs, indexes). The generated early drop of the legacy column was moved to 0002.
  - `0002_*.sql` — hand-authored (`drizzle-kit generate --custom`) backfill. It keeps the first duplicate profile and first duplicate progress pair, skips malformed/non-trackable/orphaned progress, parses legacy timestamps safely into UTC, then drops `app_settings.child_profiles`. The source column remains present until both copies complete; the migrator runs all pending files in one transaction.
  - Environment outcomes: on an empty DB, 0000's `IF NOT EXISTS` creates the baseline tables, 0001 creates the two new tables, 0002's backfill selects zero rows. On an existing `db:push`-created DB, 0000 no-ops, 0001 adds the new tables, 0002 backfills real data and drops the real column.
  - **Pre-flight before `db:migrate` on an existing database:** run the query below. It must return zero rows; any row identifies a missing or mismatched baseline column. Do not migrate on a non-empty result.

```sql
WITH expected(table_name, column_name, data_type) AS (
  VALUES
    ('videos', 'id', 'integer'),
    ('videos', 'title', 'text'),
    ('videos', 'description', 'text'),
    ('videos', 'video_url', 'text'),
    ('videos', 'thumbnail_url', 'text'),
    ('videos', 'categories', 'jsonb'),
    ('videos', 'start_seconds', 'integer'),
    ('videos', 'end_seconds', 'integer'),
    ('videos', 'position', 'integer'),
    ('videos', 'created_at', 'timestamp without time zone'),
    ('app_settings', 'id', 'integer'),
    ('app_settings', 'screen_time_minutes', 'integer'),
    ('app_settings', 'queue_video_ids', 'jsonb'),
    ('app_settings', 'child_profiles', 'jsonb'),
    ('app_settings', 'content_categories', 'jsonb')
)
SELECT * FROM expected
EXCEPT
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = current_schema();
```
  - Apply via `pnpm run db:migrate` (never `db:push` for this change — `db:push` cannot run the hand-authored backfill/drop). The `docker-compose.yml` startup flow still runs `db:push`; a local volume with real profile data must be migrated via `pnpm run db:migrate` once, since `db:push` alone will not run the backfill or drop the legacy column.
- **Caching:** TanStack Query on the client; `cache: "no-store"` on critical fetches in `lib/api.ts`.

## Infrastructure

- **Hosting:** Vercel.
- **Deployment:** `pnpm run deploy:vercel` or Vercel Git integration.
- **Database:** Neon Postgres with pooled connection string in `DATABASE_URL`.
- **Environment:** `DATABASE_URL`, `ADMIN_PASSWORD`, `YOUTUBE_API_KEY` (server-only). See `.env.example`.

## Testing

No test framework (jest/vitest) is configured. Validation relies on `pnpm run lint`,
`pnpm run build`, and `pnpm run db:generate` (produces migration SQL, touches no database) as
the required gate — `db:push` and `db:migrate` against a real database are not part of this
gate. `tsx` (existing devDependency) runs two kinds of scripts under `scripts/`:

- **Pure-logic assertion scripts** (no `DATABASE_URL` needed, run every time): e.g.
  `scripts/assert-progress-cap-order.ts`, `scripts/assert-child-profile-dto.ts`,
  `scripts/assert-trackable-video.ts`, `scripts/assert-stale-progress-filter.ts`. Each exits
  non-zero on failure so they compose with CI-style gating (`pnpm exec tsx scripts/<name>.ts`).
- **Opt-in DB scripts** require `VIDEO_PROGRESS_TEST_DATABASE_URL` plus
  `VIDEO_PROGRESS_TEST_CONFIRM=write-fixtures`; an ambient `DATABASE_URL` cannot activate
  them. `scripts/verify-video-progress-db.ts` writes temporary fixtures to a migrated test
  database and cleans them up. It refuses to run when `NODE_ENV=production`.

Add more tests when other behavior-critical areas need regression coverage.

## Important Boundaries

| Boundary | Rule |
|----------|------|
| Client / server | Secrets and DB access stay server-side. Client uses `lib/api.ts` wrappers. |
| UI / business logic | Keep validation and data rules in `lib/` and route handlers, not in presentation components. |
| API / data access | Route handlers orchestrate; Drizzle queries live in handlers or `lib/*-server.ts` modules. |
| Public / admin | `GET` on videos and queue is public; mutations require admin password header. |

## Key Paths

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Public video grid |
| `app/watch/[id]/page.tsx` | Watch experience |
| `app/admin/page.tsx` | Admin entry |
| `components/Player.tsx` | YouTube playback, clip enforcement |
| `components/WatchTimer.tsx` | Screen-time timer UI |
| `components/AdminPanel.tsx` | Admin shell |
| `lib/validation.ts` | Zod schemas for API payloads |

## Architectural Decisions

See `docs/decisions/` for recorded decisions. Document new significant choices there rather than expanding `AGENTS.md`.
