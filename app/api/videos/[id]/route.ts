import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { videoUpdate } from "@/lib/validation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }
  const [row] = await db.select().from(videos).where(eq(videos.id, numId));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(req)) return unauthorized();
  const { id } = await params;
  const numId = Number(id);
  const body = await req.json();
  const parsed = videoUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const [row] = await db
    .update(videos)
    .set(parsed.data)
    .where(eq(videos.id, numId))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(req)) return unauthorized();
  const { id } = await params;
  const numId = Number(id);
  const [row] = await db
    .delete(videos)
    .where(eq(videos.id, numId))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
