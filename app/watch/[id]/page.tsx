"use client";

import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Home } from "lucide-react";
import { BreakModeScreen } from "@/components/BreakModeScreen";
import { Player } from "@/components/Player";
import { WatchQueue } from "@/components/WatchQueue";
import {
  getProfiles,
  getQueue,
  listVideos,
  recordWatchHistory,
  saveVideoProgress,
} from "@/lib/api";
import { useActiveChildProfile } from "@/lib/profiles";
import { getSessionPlaybackQueue, getVisibleVideos } from "@/lib/queue";
import { PASTELS } from "@/lib/theme";
import { useWatchTimer } from "@/lib/timer-store";
import {
  getSavedVideoProgress,
  isTrackableVideo,
  shouldOfferResume,
} from "@/lib/video-progress";
import {
  getFullscreenPreference,
  getTheaterModePreference,
  setFullscreenPreference,
  setTheaterModePreference,
} from "@/lib/watch-preferences";
import { VIDEO_PROGRESS_SAVE_INTERVAL_MS } from "@/lib/config/video-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ queue?: string }>;
}): ReactElement {
  const { id } = use(params);
  const { queue: queueMode } = use(searchParams);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { expired } = useWatchTimer();
  const [sessionQueueIds] = useState<number[]>(() => getSessionPlaybackQueue());
  const [theaterMode, setTheaterMode] = useState(() => getTheaterModePreference());
  const [currentWatchedSeconds, setCurrentWatchedSeconds] = useState(0);
  const [isTrackable, setIsTrackable] = useState(false);
  const latestPlaybackRef = useRef({ positionSeconds: 0, durationSeconds: 0 });
  const lastProgressSaveRef = useRef(0);
  const useSessionQueue = queueMode === "session";

  const { data: videos } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });
  const { data: queue, isLoading: isQueueLoading } = useQuery({
    queryKey: ["queue"],
    queryFn: getQueue,
  });
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
  });
  const activeProfile = useActiveChildProfile(profiles?.childProfiles);
  const history = useMutation({
    mutationFn: recordWatchHistory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profiles"] }),
  });
  const progress = useMutation({
    mutationFn: saveVideoProgress,
  });

  const { current, currentIdx, next, isQueueActive, playlist } = useMemo(() => {
    if (!videos) {
      return {
        current: null,
        currentIdx: -1,
        next: null,
        isQueueActive: false,
        playlist: [] as NonNullable<typeof videos>,
      };
    }

    const visible = getVisibleVideos(
      videos,
      useSessionQueue ? sessionQueueIds : (queue?.queueVideoIds ?? []),
    );
    const idx = visible.videos.findIndex((v) => String(v.id) === String(id));

    return {
      current: idx >= 0 ? visible.videos[idx] : null,
      currentIdx: idx,
      next:
        idx >= 0 && idx < visible.videos.length - 1
          ? visible.videos[idx + 1]
          : null,
      isQueueActive: visible.isQueueActive,
      playlist: visible.videos,
    };
  }, [id, queue, sessionQueueIds, useSessionQueue, videos]);

  useEffect(() => {
    setCurrentWatchedSeconds(0);
    setIsTrackable(false);
    latestPlaybackRef.current = { positionSeconds: 0, durationSeconds: 0 };
    lastProgressSaveRef.current = 0;
  }, [id]);

  const appliedResumeRef = useRef<{
    videoId: number;
    seconds: number | null;
  } | null>(null);

  const savedProgress = useMemo(() => {
    if (!activeProfile || !current) return null;

    return getSavedVideoProgress(activeProfile.videoProgress, current.id);
  }, [activeProfile, current]);

  const resumePositionSeconds = useMemo(() => {
    if (!current || !profiles) return null;

    if (appliedResumeRef.current?.videoId === current.id) {
      return appliedResumeRef.current.seconds;
    }

    const seconds =
      savedProgress &&
      shouldOfferResume(
        savedProgress.positionSeconds,
        savedProgress.totalSeconds,
        current.startSeconds,
        current.endSeconds,
      )
        ? savedProgress.positionSeconds
        : null;

    appliedResumeRef.current = { videoId: current.id, seconds };
    return seconds;
  }, [current, profiles, savedProgress]);

  const persistProgress = useCallback(
    (input: {
      positionSeconds: number;
      durationSeconds: number;
      clear?: boolean;
    }): void => {
      if (!activeProfile || !current) return;
      if (!input.clear && !isTrackableVideo(input.durationSeconds)) return;

      progress.mutate({
        profileId: activeProfile.id,
        videoId: current.id,
        positionSeconds: Math.floor(input.positionSeconds),
        totalSeconds: Math.floor(input.durationSeconds),
        clear: input.clear,
      });
    },
    [activeProfile, current, progress.mutate],
  );

  const handlePlaybackTick = useCallback(
    (positionSeconds: number, durationSeconds: number): void => {
      latestPlaybackRef.current = { positionSeconds, durationSeconds };

      if (!activeProfile || !current || !isTrackableVideo(durationSeconds)) {
        return;
      }

      const now = Date.now();
      if (now - lastProgressSaveRef.current < VIDEO_PROGRESS_SAVE_INTERVAL_MS) return;

      lastProgressSaveRef.current = now;
      persistProgress({ positionSeconds, durationSeconds });
    },
    [activeProfile, current, persistProgress],
  );

  const leaveSaveRef = useRef({
    isTrackable: false,
    profileId: null as string | null,
    videoId: null as number | null,
  });
  leaveSaveRef.current = {
    isTrackable,
    profileId: activeProfile?.id ?? null,
    videoId: current?.id ?? null,
  };

  useEffect(() => {
    return () => {
      const leave = leaveSaveRef.current;
      if (!leave.isTrackable || !leave.profileId || leave.videoId == null) return;

      const { positionSeconds, durationSeconds } = latestPlaybackRef.current;
      if (!isTrackableVideo(durationSeconds)) return;

      void saveVideoProgress({
        profileId: leave.profileId,
        videoId: leave.videoId,
        positionSeconds: Math.floor(positionSeconds),
        totalSeconds: Math.floor(durationSeconds),
      });
    };
  }, [id]);

  const goNext = (
    status: "completed" | "skipped" = "skipped",
    watchedSeconds = 0,
  ): void => {
    if (current && activeProfile) {
      history.mutate({
        profileId: activeProfile.id,
        video: current,
        status,
        watchedSeconds,
      });

      const { positionSeconds, durationSeconds } = latestPlaybackRef.current;
      if (isTrackableVideo(durationSeconds)) {
        persistProgress({
          positionSeconds,
          durationSeconds,
          clear: status === "completed",
        });
      }
    }

    const queueSuffix = useSessionQueue ? "?queue=session" : "";
    if (next) router.push(`/watch/${next.id}${queueSuffix}`);
    else router.push("/");
  };

  if (!videos || isQueueLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-6 md:pt-8">
        <div className="space-y-5">
          <Skeleton className="h-14 w-full rounded-full" />
          <Skeleton className="aspect-video w-full rounded-[2rem]" />
          <Skeleton className="h-10 w-2/3 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 text-center md:pt-12">
        <div className="mx-auto max-w-md rounded-[2rem] bg-white/85 p-8 shadow-xl ring-1 ring-black/[0.04] backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/tots-brand-kit/svg/tots-icon.svg"
            alt=""
            aria-hidden
            className="mx-auto mb-3 size-20 rounded-3xl"
          />
          <h2 className="font-display text-2xl font-bold">Hmm, no show here</h2>
          <p className="mt-2 text-muted-foreground">
            This video may have been removed. Let&apos;s go back home.
          </p>
          <Link
            href="/"
            className={cn(
              "mt-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--tots-ink)] px-5 py-3 font-semibold text-[color:var(--tots-cream)] shadow-lg shadow-[color:var(--tots-ink)]/25 transition",
              "hover:-translate-y-0.5 hover:brightness-110",
            )}
          >
            <Home className="size-4" />
            Back home
          </Link>
        </div>
      </main>
    );
  }

  const tone = currentIdx >= 0 ? PASTELS[currentIdx % PASTELS.length] : PASTELS[0];

  return (
    <main className="mx-auto max-w-[1600px] px-4 pb-20 pt-6 md:pt-8">
      <div
        className={cn(
          "grid gap-6",
          theaterMode
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start",
        )}
      >
        <div className="min-w-0">
          {/* Player frame with pastel glow */}
          <div
            className="relative overflow-hidden rounded-[2rem] border-2 border-white/70 p-2 shadow-[0_30px_70px_-20px_rgba(80,90,160,0.45)] ring-1 ring-black/[0.04] backdrop-blur md:p-3"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklch, ${tone} 70%, white), white)`,
            }}
          >
            {/* corner stickers */}
            <span
              className="pointer-events-none absolute -left-3 -top-3 grid size-12 place-items-center rounded-full bg-white text-xl shadow-lg ring-2 ring-white animate-float-slow"
              aria-hidden
            >
              ☁️
            </span>
            <span
              className="pointer-events-none absolute -right-3 -bottom-3 grid size-12 place-items-center rounded-full bg-white text-xl shadow-lg ring-2 ring-white animate-float-slower"
              aria-hidden
            >
              ⭐
            </span>

            {expired ? (
              <BreakModeScreen
                hasSongs={videos.some((video) => video.categories.includes("Songs"))}
              />
            ) : (
              <div className="overflow-hidden rounded-[1.4rem]">
                <Player
                  key={current.id}
                  videoUrl={current.videoUrl}
                  startSeconds={current.startSeconds}
                  endSeconds={current.endSeconds}
                  initialPositionSeconds={resumePositionSeconds}
                  onEnded={goNext}
                  onProgress={setCurrentWatchedSeconds}
                  onDurationKnown={(durationSeconds) => {
                    setIsTrackable(isTrackableVideo(durationSeconds));
                  }}
                  onPlaybackTick={handlePlaybackTick}
                  isTheaterMode={theaterMode}
                  onToggleTheaterMode={() =>
                    setTheaterMode((v) => {
                      const next = !v;
                      setTheaterModePreference(next);
                      return next;
                    })
                  }
                  initialFullscreen={getFullscreenPreference()}
                  onFullscreenChange={setFullscreenPreference}
                />
              </div>
            )}
          </div>

          {/* Title */}
          <div className="mt-7 px-1">
            <h1 className="text-balance font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {current.title}
            </h1>
            {isQueueActive ? (
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                Playing from {useSessionQueue ? "this category" : "today's queue"}
              </p>
            ) : null}
            <div
              className="mt-3 h-1 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${tone}, transparent)`,
              }}
            />
          </div>
        </div>

        {/* Queue */}
        <WatchQueue
          playlist={playlist}
          currentVideoId={current.id}
          useSessionQueue={useSessionQueue}
          sticky={!theaterMode}
        />
      </div>
    </main>
  );
}
