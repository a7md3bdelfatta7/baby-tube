import type { Video } from "@/db/schema";

const SESSION_QUEUE_KEY = "babytube.session.queue";

export type QueueState = {
  queueVideoIds: number[];
};

export type VisibleVideos = {
  videos: Video[];
  isQueueActive: boolean;
};

export function orderVideosForQueue(
  videos: readonly Video[],
  queueVideoIds: readonly number[],
): Video[] {
  const videoById = new Map(videos.map((video) => [video.id, video]));

  return queueVideoIds
    .map((id) => videoById.get(id))
    .filter((video): video is Video => Boolean(video));
}

export function getVisibleVideos(
  videos: readonly Video[],
  queueVideoIds: readonly number[],
): VisibleVideos {
  const queuedVideos = orderVideosForQueue(videos, queueVideoIds);

  if (queuedVideos.length === 0) {
    return {
      videos: [...videos],
      isQueueActive: false,
    };
  }

  return {
    videos: queuedVideos,
    isQueueActive: true,
  };
}

export function getSessionPlaybackQueue(): number[] {
  if (typeof window === "undefined") return [];

  const raw = window.sessionStorage.getItem(SESSION_QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (id): id is number => Number.isInteger(id) && id > 0,
    );
  } catch {
    return [];
  }
}

export function setSessionPlaybackQueue(videoIds: readonly number[]): void {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    SESSION_QUEUE_KEY,
    JSON.stringify(Array.from(new Set(videoIds))),
  );
}
