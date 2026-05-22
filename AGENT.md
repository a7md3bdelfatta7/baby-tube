# Agent Guide

## Project Overview

Baby Tube is a curated YouTube video player for children. It has a public home page, a watch page with clip enforcement and a 15-minute screen-time timer, and an admin area for adding, editing, deleting, bulk uploading, and importing YouTube playlist videos.

## Stack

- Next.js App Router with TypeScript. `package.json` currently pins `next` to `16.2.4`.
- React 18, Tailwind CSS, shadcn-style UI components, Base UI, Lucide icons.
- TanStack Query for client-side data fetching and mutation cache invalidation.
- `react-youtube` for YouTube IFrame playback.
- Postgres with Drizzle ORM and `postgres`.
- Docker Compose for local Postgres plus app dev.
- Vercel for deployment, usually with Neon as the production Postgres provider.

## Package Manager

Use `pnpm` for local package and script commands. A `pnpm-lock.yaml` is present.

Common commands:

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run lint
pnpm run db:push
pnpm run db:generate
pnpm run db:migrate
pnpm run deploy:vercel
```

The Dockerfile and compose file currently use `npm` internally; do not change that unless the container setup is being intentionally updated.

## Local Development

Environment variables are documented in `.env.example`:

- `DATABASE_URL`: Postgres connection string.
- `ADMIN_PASSWORD`: password used by admin APIs. The local default is `babygirl123`; change it for production.
- `YOUTUBE_API_KEY`: server-only YouTube Data API key for playlist import.

Docker flow:

```bash
cp .env.example .env
docker compose up --build
```

The compose app starts Postgres 16, runs `db:push`, and serves the app on `http://localhost:3000`.

Non-Docker flow:

```bash
cp .env.example .env.local
pnpm install
pnpm run db:push
pnpm run dev
```

## Important Paths

- `app/page.tsx`: public video grid.
- `app/watch/[id]/page.tsx`: watch experience and next-video flow.
- `app/admin/page.tsx`: admin entry point.
- `components/AdminGate.tsx`: password gate for admin UI.
- `components/AdminPanel.tsx`: admin video list, single upload, multi upload, and playlist import UI.
- `components/Player.tsx`: YouTube playback, start/end clip enforcement, error skip behavior, and timer play state updates.
- `components/WatchTimer.tsx`: fixed 15-minute timer UI.
- `lib/timer-store.ts`: persisted watch timer state.
- `lib/api.ts`: client-side API wrapper. Admin mutations send `x-admin-password` from local storage.
- `lib/auth.ts`: server-side admin password check.
- `lib/validation.ts`: Zod schemas for video create/update payloads.
- `lib/youtube.ts`: YouTube URL, video ID, playlist ID, thumbnail, and playlist-fetch helpers.
- `db/schema.ts`: Drizzle schema and exported video types.
- `db/index.ts`: lazy Drizzle DB proxy. It avoids throwing at import time when `DATABASE_URL` is missing.
- `app/api/videos/route.ts`: list and create videos.
- `app/api/videos/[id]/route.ts`: get, update, and delete one video.
- `app/api/videos/import-playlist/route.ts`: server-side playlist import. It has `maxDuration = 60` for Vercel.

## Data Model

The main table is `videos`:

- `id`
- `title`
- `description`
- `videoUrl`
- `thumbnailUrl`
- `startSeconds`
- `endSeconds`
- `position`
- `createdAt`

Video ordering is by `position`, then `id`.

When changing persisted data, update `db/schema.ts` first, then run the appropriate Drizzle command. For local development, `pnpm run db:push` is the common path.

## API And Auth Notes

- Public reads are allowed through `GET /api/videos` and `GET /api/videos/:id`.
- Mutating video routes require the `x-admin-password` header.
- The admin password is compared against `ADMIN_PASSWORD` in `lib/auth.ts`.
- The playlist import route requires `YOUTUBE_API_KEY` on the server. Never expose this key to client code.
- Client API helpers live in `lib/api.ts`; keep raw fetch details out of UI components when adding new API behavior.

## UI And Code Conventions

- Prefer TypeScript, named exports, functional components, and explicit return types for new functions.
- Use existing components from `components/ui` before adding new primitives.
- Use Tailwind classes and existing `cn` helper from `lib/utils.ts`.
- Use the `@/*` path alias.
- Keep server-only logic in route handlers, `db`, or `lib` modules. Do not move secrets or database calls into client components.
- Keep validation schemas in `lib/validation.ts` or nearby server-side validation modules.
- Use TanStack Query patterns already present in `AdminPanel` for client-side mutations and cache invalidation.

## Validation Before Hand-Off

For most code changes, run:

```bash
pnpm run lint
pnpm run build
```

If database schema or query behavior changed, also run:

```bash
pnpm run db:push
```

Only run database commands against production when explicitly requested and when `DATABASE_URL` is intentionally pointed at the production database.

## Deployment Notes

Production is intended for Vercel with Neon Postgres:

- Configure `DATABASE_URL`, `ADMIN_PASSWORD`, and `YOUTUBE_API_KEY` in Vercel.
- Use a Neon pooled connection string for `DATABASE_URL`.
- Apply schema changes deliberately before or during deployment.
- `pnpm run deploy:vercel` runs `vercel deploy --prod`.

## Gotchas

- `README.md` mentions Next.js 15, but `package.json` currently uses Next.js 16. Trust `package.json` for the installed version.
- `react-youtube` autoplay relies on starting muted and then unmuting in `Player`.
- The watch timer only counts down while `Player` reports that video playback is active.
- YouTube does not provide a reliable player parameter to hide or disable the in-iframe "More videos" overlay. `Player` currently uses positioned click shields to block the known external navigation areas, but that is layout-dependent and may break if YouTube changes its embed UI. A more reliable future approach is to set `pointer-events: none` on the YouTube iframe and provide app-owned play/pause/resume controls that call the YouTube Player API (`playVideo()` and `pauseVideo()`). This disables native iframe clicks, so add custom controls before using it.
- Admin password is stored in browser local storage under `babytube.admin.pw`.
- Do not commit `.env`, production credentials, YouTube API keys, Neon URLs, or Vercel tokens.
