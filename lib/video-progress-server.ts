import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  childProfiles,
  videoProgress,
  videos,
  type VideoProgressEntry,
} from "@/db/schema";
import { isTrackableVideo } from "@/lib/video-progress";

const MAX_PROGRESS_ITEMS = 50;

type VideoProgressRow = typeof videoProgress.$inferSelect;

export function selectCapKeepIds(
  rows: readonly Pick<VideoProgressRow, "id" | "updatedAt">[],
  cap: number,
): Set<number> {
  const sorted = [...rows].sort(
    (a, b) =>
      b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id,
  );

  return new Set(sorted.slice(0, cap).map((row) => row.id));
}

function toEntry(row: VideoProgressRow): VideoProgressEntry {
  return {
    videoId: row.videoId,
    positionSeconds: row.positionSeconds,
    totalSeconds: row.totalSeconds,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getVideoProgress(
  profileId: string,
): Promise<VideoProgressEntry[]> {
  const rows = await db
    .select()
    .from(videoProgress)
    .where(eq(videoProgress.profileId, profileId))
    .orderBy(desc(videoProgress.updatedAt), desc(videoProgress.id));

  return rows.map(toEntry);
}

async function profileHasRow(profileId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: childProfiles.id })
    .from(childProfiles)
    .where(eq(childProfiles.id, profileId));

  return Boolean(row);
}

async function videoExists(videoId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: videos.id })
    .from(videos)
    .where(eq(videos.id, videoId));

  return Boolean(row);
}

export async function upsertVideoProgress(
  profileId: string,
  videoId: number,
  positionSeconds: number,
  totalSeconds: number,
): Promise<VideoProgressEntry[] | null> {
  if (!(await profileHasRow(profileId))) return null;

  if (!isTrackableVideo(totalSeconds)) {
    await db
      .delete(videoProgress)
      .where(
        and(
          eq(videoProgress.profileId, profileId),
          eq(videoProgress.videoId, videoId),
        ),
      );
    return getVideoProgress(profileId);
  }

  if (!(await videoExists(videoId))) {
    return getVideoProgress(profileId);
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(videoProgress)
      .values({
        profileId,
        videoId,
        positionSeconds,
        totalSeconds,
        updatedAt: sql`clock_timestamp() AT TIME ZONE 'UTC'`,
      })
      .onConflictDoUpdate({
        target: [videoProgress.profileId, videoProgress.videoId],
        set: {
          positionSeconds,
          totalSeconds,
          updatedAt: sql`clock_timestamp() AT TIME ZONE 'UTC'`,
        },
      });

    await tx.execute(sql`
      DELETE FROM "video_progress"
      WHERE "profile_id" = ${profileId}
        AND "id" NOT IN (
          SELECT "id"
          FROM "video_progress"
          WHERE "profile_id" = ${profileId}
          ORDER BY "updated_at" DESC, "id" DESC
          LIMIT ${MAX_PROGRESS_ITEMS}
        )
    `);
  });

  return getVideoProgress(profileId);
}

export async function clearVideoProgress(
  profileId: string,
  videoId: number,
): Promise<VideoProgressEntry[] | null> {
  if (!(await profileHasRow(profileId))) return null;

  await db
    .delete(videoProgress)
    .where(
      and(
        eq(videoProgress.profileId, profileId),
        eq(videoProgress.videoId, videoId),
      ),
    );

  return getVideoProgress(profileId);
}
