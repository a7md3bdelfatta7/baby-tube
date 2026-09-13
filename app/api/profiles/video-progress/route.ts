import { NextRequest, NextResponse } from "next/server";
import { profileExists } from "@/lib/child-profiles-server";
import type { VideoProgressEntry } from "@/db/schema";
import {
  clearVideoProgress,
  getVideoProgress,
  upsertVideoProgress,
} from "@/lib/video-progress-server";
import { isTrackableVideo } from "@/lib/video-progress";
import { videoProgressInput, videoProgressQuery } from "@/lib/validation";

function progressResponse(
  profileId: string,
  videoProgress: VideoProgressEntry[],
): Response {
  return NextResponse.json({ profileId, videoProgress });
}

export async function GET(req: NextRequest): Promise<Response> {
  const parsed = videoProgressQuery.safeParse({
    profileId: req.nextUrl.searchParams.get("profileId") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!(await profileExists(parsed.data.profileId))) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const videoProgress = await getVideoProgress(parsed.data.profileId);

  return progressResponse(parsed.data.profileId, videoProgress);
}

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json();
  const parsed = videoProgressInput.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { profileId, videoId, positionSeconds, totalSeconds, clear } =
    parsed.data;

  const videoProgress = clear || !isTrackableVideo(totalSeconds)
    ? await clearVideoProgress(profileId, videoId)
    : await upsertVideoProgress(profileId, videoId, positionSeconds, totalSeconds);

  if (videoProgress === null) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return progressResponse(profileId, videoProgress);
}
