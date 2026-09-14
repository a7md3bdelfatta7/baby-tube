"use client";

import type { ReactElement } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { TheaterModeIcon } from "@/components/icons/TheaterModeIcon";
import { extractVideoId } from "@/lib/youtube";
import { timerStore } from "@/lib/timer-store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  videoUrl: string;
  startSeconds?: number | null;
  endSeconds?: number | null;
  initialPositionSeconds?: number | null;
  onEnded: (status: "completed" | "skipped", watchedSeconds: number) => void;
  onProgress?: (watchedSeconds: number) => void;
  onDurationKnown?: (durationSeconds: number) => void;
  onPlaybackTick?: (positionSeconds: number, durationSeconds: number) => void;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  initialFullscreen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
};

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function Player({
  videoUrl,
  startSeconds,
  endSeconds,
  initialPositionSeconds,
  onEnded,
  onProgress,
  onDurationKnown,
  onPlaybackTick,
  isTheaterMode = false,
  onToggleTheaterMode,
  initialFullscreen = false,
  onFullscreenChange,
}: Props): ReactElement {
  const id = extractVideoId(videoUrl);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const watchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(
    initialPositionSeconds ?? startSeconds ?? 0,
  );
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [hasResumePosition, setHasResumePosition] = useState(
    typeof initialPositionSeconds === "number" && initialPositionSeconds > 0,
  );

  useEffect(() => {
    endedRef.current = false;
    setError(null);
    setIsReady(false);
    setIsPlaying(false);
    setHasStarted(false);
    setCurrentSeconds(initialPositionSeconds ?? startSeconds ?? 0);
    setDurationSeconds(0);
    setHasResumePosition(
      typeof initialPositionSeconds === "number" && initialPositionSeconds > 0,
    );
    return () => {
      if (watchRef.current) clearInterval(watchRef.current);
      timerStore.setPlaying(false);
    };
    // Resume is applied when the video changes. Progress syncs must not
    // reset playback or the screen-time timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [startSeconds, videoUrl]);

  const hasStartedRef = useRef(false);
  hasStartedRef.current = hasStarted;

  useEffect(() => {
    if (hasStartedRef.current) return;
    if (typeof initialPositionSeconds !== "number" || initialPositionSeconds <= 0) {
      return;
    }

    setHasResumePosition(true);
    setCurrentSeconds(initialPositionSeconds);

    try {
      playerRef.current?.seekTo(initialPositionSeconds, true);
    } catch {
      /* player may not be ready yet */
    }
  }, [initialPositionSeconds]);

  useEffect(() => {
    const syncFullscreenState = (): void => {
      const isFs = document.fullscreenElement === containerRef.current;
      setIsFullscreen(isFs);
      onFullscreenChange?.(isFs);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onFullscreenChange identity may change without needing a re-subscribe
  }, []);

  useEffect(() => {
    if (!initialFullscreen || document.fullscreenElement) return;

    // Best effort: browsers only grant this without a fresh user gesture
    // when one is still active from the navigation that brought us here
    // (e.g. clicking "next"); it silently no-ops otherwise.
    containerRef.current?.requestFullscreen().catch(() => {
      /* fullscreen requires an active user gesture in most browsers */
    });
    // Only attempt this once, when the player for this video mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  if (!id) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-border bg-muted/80 px-6 text-center shadow-inner">
        <Alert variant="default" className="max-w-md border-border shadow-md">
          <AlertCircle className="size-5 text-muted-foreground" />
          <AlertTitle>Invalid link</AlertTitle>
          <AlertDescription>
            Couldn&apos;t read this video URL. Try another link from Admin.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const watchedSecondsFor = (currentTime: number): number =>
    Math.max(0, Math.round(currentTime - (startSeconds ?? 0)));

  const updatePlaybackProgress = (): void => {
    const player = playerRef.current;
    if (!player) return;

    try {
      const currentTime = player.getCurrentTime?.();
      const duration = player.getDuration?.();

      if (typeof currentTime === "number") {
        setCurrentSeconds(currentTime);
        onProgress?.(watchedSecondsFor(currentTime));
      }

      if (typeof duration === "number" && duration > 0) {
        setDurationSeconds(duration);
        onPlaybackTick?.(
          Math.floor(currentTime ?? currentSeconds),
          Math.floor(duration),
        );
      }
    } catch {
      /* player API may throw while tearing down */
    }
  };

  const watchedSeconds = (): number => {
    try {
      const currentTime = playerRef.current?.getCurrentTime?.();
      if (typeof currentTime === "number") {
        return watchedSecondsFor(currentTime);
      }
    } catch {
      /* player API may throw while tearing down */
    }

    return watchedSecondsFor(currentSeconds);
  };

  const startEnforced = (): void => {
    if (watchRef.current) clearInterval(watchRef.current);
    watchRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const t = p.getCurrentTime?.();
        updatePlaybackProgress();
        if (typeof t === "number" && endSeconds && t >= endSeconds) {
          if (!endedRef.current) {
            endedRef.current = true;
            timerStore.setPlaying(false);
            onEnded("completed", watchedSeconds());
          }
        }
      } catch {
        /* player API may throw while tearing down */
      }
    }, 500);
  };

  const handleReady = (e: YouTubeEvent): void => {
    playerRef.current = e.target;
    setIsReady(true);
    try {
      e.target.mute();
      e.target.setVolume(80);
      const duration = e.target.getDuration?.();
      if (typeof duration === "number" && duration > 0) {
        setDurationSeconds(duration);
        onDurationKnown?.(duration);
      }

      if (
        typeof initialPositionSeconds === "number" &&
        initialPositionSeconds > 0
      ) {
        e.target.seekTo(initialPositionSeconds, true);
        setCurrentSeconds(initialPositionSeconds);
        return;
      }

      e.target.playVideo();
    } catch {
      /* player API can throw before the iframe is fully ready */
    }
  };

  const handleStateChange = (e: YouTubeEvent): void => {
    const s = e.data;
    if (s === 1) {
      setIsPlaying(true);
      setHasStarted(true);
      setHasResumePosition(false);
      timerStore.setPlaying(true);
      try {
        e.target.unMute();
      } catch {
        /* ignore */
      }
      startEnforced();
    } else if (s === 2 || s === 0) {
      setIsPlaying(false);
      timerStore.setPlaying(false);
      updatePlaybackProgress();
      if (s === 0) {
        if (!endedRef.current) {
          endedRef.current = true;
          onEnded("completed", watchedSeconds());
        }
      }
    }
  };

  const handleError = (): void => {
    setError("Couldn't play this one — skipping to the next video…");
    setTimeout(() => {
      if (!endedRef.current) {
        endedRef.current = true;
        onEnded("skipped", watchedSeconds());
      }
    }, 1500);
  };

  const playVideo = (): void => {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (endedRef.current) {
        endedRef.current = false;
        player.seekTo(startSeconds ?? 0, true);
      }
      updatePlaybackProgress();
      player.unMute();
      player.setVolume(80);
      player.playVideo();
    } catch {
      setError("Couldn't start this one. Try the next video.");
    }
  };

  const pauseVideo = (): void => {
    try {
      playerRef.current?.pauseVideo();
    } catch {
      /* player API may throw while tearing down */
    }
  };

  const replayVideo = (): void => {
    const player = playerRef.current;
    if (!player) return;

    try {
      endedRef.current = false;
      player.seekTo(startSeconds ?? 0, true);
      setCurrentSeconds(startSeconds ?? 0);
      player.playVideo();
    } catch {
      setError("Couldn't replay this one. Try the next video.");
    }
  };

  const handleNext = (): void => {
    if (endedRef.current) return;
    endedRef.current = true;
    timerStore.setPlaying(false);
    try {
      playerRef.current?.pauseVideo();
    } catch {
      /* player API may throw while tearing down */
    }
    onEnded("skipped", watchedSeconds());
  };

  const toggleFullscreen = async (): Promise<void> => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await containerRef.current?.requestFullscreen();
    } catch {
      /* fullscreen may be blocked or unavailable on some browsers */
    }
  };

  const progressStart = startSeconds ?? 0;
  const progressEnd =
    endSeconds && endSeconds > progressStart
      ? endSeconds
      : Math.max(durationSeconds, progressStart);
  const progressDuration = Math.max(1, progressEnd - progressStart);
  const elapsedSeconds = Math.min(
    progressDuration,
    Math.max(0, currentSeconds - progressStart),
  );
  const progressPercent = (elapsedSeconds / progressDuration) * 100;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-inner ring-1 ring-black/10 fullscreen:rounded-none"
    >
      <YouTube
        videoId={id}
        opts={{
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            mute: 1,
            playsinline: 1,
            start: startSeconds ?? undefined,
            end: endSeconds ?? undefined,
          },
        }}
        className="h-full w-full"
        iframeClassName="h-full w-full pointer-events-none"
        onReady={handleReady}
        onStateChange={handleStateChange}
        onError={handleError}
        onEnd={() => {
          if (!endedRef.current) {
            endedRef.current = true;
            onEnded("completed", watchedSeconds());
          }
        }}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 transition-opacity",
          isPlaying && hasStarted ? "opacity-0" : "opacity-100",
        )}
        aria-hidden="true"
      />
      {!hasStarted && !error ? (
        <div className="absolute inset-0 grid place-items-center bg-black/20 p-6 text-center backdrop-blur-[1px]">
          <Button
            type="button"
            size="lg"
            disabled={!isReady}
            onClick={playVideo}
            className={cn(
              "h-auto rounded-full bg-white px-7 py-4 font-display text-lg font-bold text-[color:var(--tots-ink)] shadow-2xl ring-4 ring-white/30 transition",
              "hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_24px_60px_rgba(255,255,255,0.25)]",
            )}
          >
            <Play className="mr-2 size-8 fill-current" aria-hidden />
            {isReady
              ? hasResumePosition
                ? "Continue watching"
                : "Play show"
              : "Getting ready"}
          </Button>
        </div>
      ) : null}
      {!error ? (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-14">
          <div className="mx-auto mb-3 flex w-full max-w-2xl items-center gap-3 text-xs font-semibold tabular-nums text-white/90">
            <span>{formatTime(elapsedSeconds)}</span>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-white/25"
              role="progressbar"
              aria-label="Video progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPercent)}
            >
              <div
                className="h-full rounded-full bg-[color:var(--tots-sunshine)] transition-[width] duration-300 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>{formatTime(progressDuration)}</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              disabled={!isReady}
              onClick={isPlaying ? pauseVideo : playVideo}
              className="size-12 rounded-full bg-white/95 text-[color:var(--tots-ink)] shadow-xl hover:bg-white"
              aria-label={isPlaying ? "Pause video" : "Resume video"}
            >
              {isPlaying ? (
                <Pause className="size-5 fill-current" aria-hidden />
              ) : (
                <Play className="size-5 fill-current" aria-hidden />
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              disabled={!isReady}
              onClick={replayVideo}
              className="size-12 rounded-full bg-white/90 text-[color:var(--tots-ink)] shadow-xl hover:bg-white"
              aria-label="Replay video"
            >
              <RotateCcw className="size-5" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              onClick={handleNext}
              className="size-12 rounded-full bg-[color:var(--tots-sunshine)] text-[color:var(--tots-ink)] shadow-xl hover:brightness-105"
              aria-label="Next video"
            >
              <SkipForward className="size-5 fill-current" aria-hidden />
            </Button>
            {onToggleTheaterMode ? (
              <Button
                type="button"
                variant="secondary"
                size="icon-lg"
                onClick={onToggleTheaterMode}
                className="size-12 rounded-full bg-white/90 text-[color:var(--tots-ink)] shadow-xl hover:bg-white"
                aria-label={isTheaterMode ? "Exit theater mode" : "Theater mode"}
              >
                <TheaterModeIcon className="size-7" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              onClick={toggleFullscreen}
              className="size-12 rounded-full bg-white/90 text-[color:var(--tots-ink)] shadow-xl hover:bg-white"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="size-5" aria-hidden />
              ) : (
                <Maximize2 className="size-5" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-background/95 p-6 text-center backdrop-blur-sm">
          <p className="max-w-sm text-sm font-medium text-destructive">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
