export const MIN_TRACKING_DURATION_SECONDS = 5 * 60;

export type VideoProgressLookup = {
  videoId: number;
  positionSeconds: number;
  totalSeconds: number;
};

export function isTrackableVideo(totalSeconds: number): boolean {
  return totalSeconds > MIN_TRACKING_DURATION_SECONDS;
}

export function getSavedVideoProgress(
  videoProgress: readonly VideoProgressLookup[] | undefined,
  videoId: number,
): VideoProgressLookup | null {
  return videoProgress?.find((entry) => entry.videoId === videoId) ?? null;
}

export function shouldOfferResume(
  positionSeconds: number,
  totalSeconds: number,
  startSeconds?: number | null,
  endSeconds?: number | null,
): boolean {
  if (!isTrackableVideo(totalSeconds)) return false;

  const start = startSeconds ?? 0;
  const end = endSeconds && endSeconds > start ? endSeconds : totalSeconds;
  const minResume = start + 30;
  const maxResume = end - 30;

  return positionSeconds >= minResume && positionSeconds <= maxResume;
}
