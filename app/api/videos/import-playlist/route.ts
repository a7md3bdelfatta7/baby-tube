import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { sql } from "drizzle-orm";
import { appendVideoIdsToQueue } from "@/lib/app-settings-server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { extractPlaylistId, fetchPlaylistItems, thumbnailFor } from "@/lib/youtube";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY not configured on server" },
      { status: 500 },
    );
  }
  const { url } = await req.json();
  const playlistId = extractPlaylistId(url ?? "");
  if (!playlistId) {
    return NextResponse.json(
      { error: "Could not find a playlist id in that URL" },
      { status: 400 },
    );
  }

  let items;
  try {
    items = await fetchPlaylistItems(playlistId, apiKey);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (items.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, items: [] });
  }

  const maxPos = await db
    .select({ v: sql<number>`coalesce(max(${videos.position}), 0)` })
    .from(videos);
  let position = (maxPos[0]?.v ?? 0) + 1;

  const rows = items.map((it) => ({
    title: it.title,
    description: it.description,
    videoUrl: `https://www.youtube.com/watch?v=${it.videoId}`,
    thumbnailUrl: it.thumbnailUrl ?? thumbnailFor(it.videoId),
    position: position++,
  }));

  const inserted = await db.insert(videos).values(rows).returning();

  await appendVideoIdsToQueue(inserted.map((video) => video.id));

  return NextResponse.json({
    imported: inserted.length,
    skipped: 0,
    items: inserted,
  });
}
