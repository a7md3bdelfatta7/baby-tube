import { NextRequest, NextResponse } from "next/server";
import { appendWatchHistory, listChildProfiles } from "@/lib/child-profiles-server";
import { loadContentCategories } from "@/lib/categories-server";
import { watchHistoryInput } from "@/lib/validation";

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json();
  const parsed = watchHistoryInput.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await appendWatchHistory(parsed.data.profileId, {
    videoId: parsed.data.videoId,
    title: parsed.data.title,
    status: parsed.data.status,
    watchedSeconds: parsed.data.watchedSeconds,
  });

  const allowed = await loadContentCategories();
  const childProfiles = await listChildProfiles(allowed);

  return NextResponse.json({ childProfiles });
}
