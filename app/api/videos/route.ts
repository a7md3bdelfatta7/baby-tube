import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { asc, sql } from "drizzle-orm";
import { appendVideoIdsToQueue } from "@/lib/app-settings-server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { loadContentCategories } from "@/lib/categories-server";
import { createVideoInput } from "@/lib/validation";

export async function GET() {
  const rows = await db
    .select()
    .from(videos)
    .orderBy(asc(videos.position), asc(videos.id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const body = await req.json();
  const allowed = await loadContentCategories();
  const parsed = createVideoInput(allowed).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const maxPos = await db
    .select({ v: sql<number>`coalesce(max(${videos.position}), 0)` })
    .from(videos);
  const position = (maxPos[0]?.v ?? 0) + 1;

  const [row] = await db
    .insert(videos)
    .values({ ...parsed.data, position })
    .returning();

  await appendVideoIdsToQueue([row.id]);

  return NextResponse.json(row, { status: 201 });
}
