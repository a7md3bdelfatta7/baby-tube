import { and, asc, desc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  childProfiles,
  videoProgress,
  videos,
  type ChildProfile,
  type ChildProfileRow,
  type VideoProgressEntry,
  type VideoProgressRow,
} from "@/db/schema";
import { normalizeCategories } from "@/lib/categories";
import type { ChildProfileInput } from "@/lib/validation";
import { isTrackableVideo } from "@/lib/video-progress";

const MAX_HISTORY_ITEMS = 100;

export function toVideoProgressEntry(row: VideoProgressRow): VideoProgressEntry {
  return {
    videoId: row.videoId,
    positionSeconds: row.positionSeconds,
    totalSeconds: row.totalSeconds,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toChildProfile(
  row: ChildProfileRow,
  progress: readonly VideoProgressEntry[],
  allowed: readonly string[],
): ChildProfile {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birthDate,
    screenTimeMinutes: row.screenTimeMinutes,
    screenTimeResetHours: row.screenTimeResetHours,
    preferredCategories: normalizeCategories(row.preferredCategories, allowed),
    watchHistory: row.watchHistory,
    videoProgress: [...progress],
  };
}

export function filterKnownVideoProgress<
  T extends { videoId: number; totalSeconds: number },
>(
  entries: readonly T[],
  knownVideoIds: ReadonlySet<number>,
): T[] {
  const seenVideoIds = new Set<number>();

  return entries.filter((entry) => {
    if (
      !knownVideoIds.has(entry.videoId) ||
      !isTrackableVideo(entry.totalSeconds) ||
      seenVideoIds.has(entry.videoId)
    ) {
      return false;
    }

    seenVideoIds.add(entry.videoId);
    return true;
  });
}

async function loadProgressByProfile(
  profileIds: readonly string[],
): Promise<Map<string, VideoProgressEntry[]>> {
  const map = new Map<string, VideoProgressEntry[]>();
  if (profileIds.length === 0) return map;

  const rows = await db
    .select()
    .from(videoProgress)
    .where(inArray(videoProgress.profileId, [...profileIds]))
    .orderBy(desc(videoProgress.updatedAt), desc(videoProgress.id));

  for (const row of rows) {
    const list = map.get(row.profileId) ?? [];
    list.push(toVideoProgressEntry(row));
    map.set(row.profileId, list);
  }

  return map;
}

export async function listChildProfiles(
  allowed: readonly string[],
): Promise<ChildProfile[]> {
  const rows = await db
    .select()
    .from(childProfiles)
    .orderBy(asc(childProfiles.createdAt), asc(childProfiles.id));

  if (rows.length === 0) return [];

  const progressByProfile = await loadProgressByProfile(
    rows.map((row) => row.id),
  );

  return rows.map((row) =>
    toChildProfile(row, progressByProfile.get(row.id) ?? [], allowed),
  );
}

export async function profileExists(profileId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: childProfiles.id })
    .from(childProfiles)
    .where(eq(childProfiles.id, profileId));

  return Boolean(row);
}

export async function replaceChildProfiles(
  profiles: readonly ChildProfileInput[],
  allowed: readonly string[],
): Promise<ChildProfile[]> {
  const incomingIds = profiles.map((profile) => profile.id);

  await db.transaction(async (tx) => {
    const catalog = await tx.select({ id: videos.id }).from(videos);
    const videoIdSet = new Set(catalog.map((video) => video.id));

    if (incomingIds.length > 0) {
      await tx
        .delete(childProfiles)
        .where(notInArray(childProfiles.id, incomingIds));
    } else {
      await tx.delete(childProfiles);
    }

    for (const profile of profiles) {
      const values = {
        name: profile.name,
        birthDate: profile.birthDate,
        screenTimeMinutes: profile.screenTimeMinutes,
        screenTimeResetHours: profile.screenTimeResetHours,
        preferredCategories: profile.preferredCategories,
        watchHistory: profile.watchHistory,
      };

      await tx
        .insert(childProfiles)
        .values({ id: profile.id, ...values })
        .onConflictDoUpdate({ target: childProfiles.id, set: values });

      const filteredProgress = filterKnownVideoProgress(
        profile.videoProgress,
        videoIdSet,
      );
      const keepVideoIds = filteredProgress.map((entry) => entry.videoId);

      if (keepVideoIds.length > 0) {
        await tx
          .delete(videoProgress)
          .where(
            and(
              eq(videoProgress.profileId, profile.id),
              notInArray(videoProgress.videoId, keepVideoIds),
            ),
          );
      } else {
        await tx
          .delete(videoProgress)
          .where(eq(videoProgress.profileId, profile.id));
      }

      for (const entry of filteredProgress) {
        const progressValues = {
          positionSeconds: entry.positionSeconds,
          totalSeconds: entry.totalSeconds,
          updatedAt: new Date(entry.updatedAt),
        };

        await tx
          .insert(videoProgress)
          .values({
            profileId: profile.id,
            videoId: entry.videoId,
            ...progressValues,
          })
          .onConflictDoUpdate({
            target: [videoProgress.profileId, videoProgress.videoId],
            set: progressValues,
          });
      }
    }
  });

  return listChildProfiles(allowed);
}

export async function appendWatchHistory(
  profileId: string,
  entry: {
    videoId: number;
    title: string;
    status: "completed" | "skipped";
    watchedSeconds: number;
  },
): Promise<void> {
  const [row] = await db
    .select()
    .from(childProfiles)
    .where(eq(childProfiles.id, profileId));

  if (!row) return;

  const watchedAt = new Date().toISOString();
  const watchHistory = [
    {
      videoId: entry.videoId,
      title: entry.title,
      watchedAt,
      status: entry.status,
      watchedSeconds: entry.watchedSeconds,
    },
    ...row.watchHistory,
  ].slice(0, MAX_HISTORY_ITEMS);

  await db
    .update(childProfiles)
    .set({ watchHistory })
    .where(eq(childProfiles.id, profileId));
}
