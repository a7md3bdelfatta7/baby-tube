# Baby Tube 🎈

A safe, bubbly little video player for your baby girl. Curated YouTube videos with clip enforcement, autoplay, a 15-minute watch timer, and a simple admin to add videos one-at-a-time, in batches, or by importing a whole YouTube playlist.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind
- **TanStack Query** + **react-youtube**
- **Postgres** + **Drizzle ORM** (works with local Docker Postgres or Neon)
- **Docker Compose** for local dev
- **Vercel** for production hosting (point `DATABASE_URL` at Neon)

## Run locally with Docker

```bash
cp .env.example .env
# Put your YouTube Data API key in .env (server-side only)
docker compose up --build
```

Open http://localhost:3000.

The compose file boots a Postgres 16 container, runs `drizzle-kit push` to sync the schema, then starts Next.js in dev mode with hot reload.

Default admin password: `babygirl123` — change `ADMIN_PASSWORD` in `.env` before deploying.

## Run locally without Docker

```bash
# Have a Postgres instance running and put its URL in .env.local
npm install
npm run db:push    # creates the videos table
npm run dev
```

## Deploying to Vercel + Neon

1. Create a Neon project, copy the **pooled** connection string.
2. Push this repo to GitHub, import it on Vercel.
3. In Vercel → Project Settings → Environment Variables, add:
   - `DATABASE_URL` — your Neon pooled connection string
   - `ADMIN_PASSWORD` — a real password
   - `YOUTUBE_API_KEY` — your (rotated!) YouTube Data API v3 key
4. Apply the schema once, from your laptop:
   ```bash
   DATABASE_URL="<neon-url>" npm run db:push
   ```
5. Deploy. Done.

### Deploy with Vercel CLI (from this folder)

The Cursor/agent environment may not have your Vercel session. On your Mac (where `vercel login` already worked), run:

```bash
cd /path/to/baby-tube
vercel whoami                    # should print your username; if not: vercel login
vercel link --yes                # first time only — attaches this directory to a Vercel project
```

Add production env vars (pick one approach):

- **Dashboard:** Project → Settings → Environment Variables → `DATABASE_URL`, `ADMIN_PASSWORD`, `YOUTUBE_API_KEY` (Production).
- **CLI:** `vercel env add DATABASE_URL` (paste Neon pooled URL), then repeat for the other two.

Apply the schema to Neon once from your laptop (same URL as in Vercel):

```bash
DATABASE_URL="postgresql://…neon…" pnpm run db:push
```

Then ship:

```bash
pnpm run deploy:vercel
# same as: vercel deploy --prod
```

Optional: create a [Vercel OIDC token](https://vercel.com/docs/security/oidc) or a personal token and set `VERCEL_TOKEN` in CI so deploys work without an interactive login.

## Features

- **Home** — colorful grid of all videos
- **Watch** — autoplays muted then unmutes, enforces start/end clip times, auto-advances to the next video, "Up Next" card, skip button
- **Admin** (`/admin`)
  - Single video form
  - Multi-video upload queue with per-row status
  - YouTube playlist import (uses YouTube Data API)
  - Inline edit (pencil) and delete with confirmation
  - List view with title, link, clip range
- **15-min watch timer** — persisted across pages, color-coded warnings, only ticks while a video is playing, resettable

## Notes

- The YouTube IFrame API requires `mute=1` to autoplay; the player unmutes immediately on `onReady`. Some browsers may still keep audio muted on the very first interaction — a tap fixes it.
- For Vercel deploys, the playlist import uses `maxDuration = 60`. Large playlists (500+ videos) may need a different runtime; contact me if you hit that.
