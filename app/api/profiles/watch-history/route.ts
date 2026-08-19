import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, type AppSettings, type ChildProfile } from "@/db/schema";
import { profilesRead, watchHistoryInput } from "@/lib/validation";

const SETTINGS_ID = 1;
const MAX_HISTORY_ITEMS = 100;

async function getOrCreateSettings(): Promise<AppSettings> {
  const [existing] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID));

  if (existing) return existing;

  const [created] = await db
    .insert(appSettings)
    .values({ id: SETTINGS_ID })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID));

  if (!row) throw new Error("Unable to load profiles");

  return row;
}

function appendWatchHistory(
  profiles: readonly ChildProfile[],
  profileId: string,
  videoId: number,
  title: string,
  status: "completed" | "skipped",
  watchedSeconds: number,
): ChildProfile[] {
  const watchedAt = new Date().toISOString();

  return profiles.map((profile) => {
    if (profile.id !== profileId) return profile;

    return {
      ...profile,
      watchHistory: [
        { videoId, title, watchedAt, status, watchedSeconds },
        ...profile.watchHistory,
      ].slice(0, MAX_HISTORY_ITEMS),
    };
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json();
  const parsed = watchHistoryInput.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await getOrCreateSettings();
  const profiles = profilesRead.parse({
    childProfiles: settings.childProfiles,
  }).childProfiles;
  const childProfiles = appendWatchHistory(
    profiles,
    parsed.data.profileId,
    parsed.data.videoId,
    parsed.data.title,
    parsed.data.status,
    parsed.data.watchedSeconds,
  );

  const [updated] = await db
    .update(appSettings)
    .set({ childProfiles })
    .where(eq(appSettings.id, SETTINGS_ID))
    .returning();

  return NextResponse.json({ childProfiles: updated.childProfiles });
}
