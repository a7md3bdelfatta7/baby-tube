"use client";

import type { ReactElement } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { extractVideoId } from "@/lib/youtube";
import { timerStore } from "@/lib/timer-store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  videoUrl: string;
  startSeconds?: number | null;
  endSeconds?: number | null;
  onEnded: () => void;
};

export function Player({
  videoUrl,
  startSeconds,
  endSeconds,
  onEnded,
}: Props): ReactElement {
  const id = extractVideoId(videoUrl);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const watchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    endedRef.current = false;
    return () => {
      if (watchRef.current) clearInterval(watchRef.current);
      timerStore.setPlaying(false);
    };
  }, [videoUrl]);

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

  const startEnforced = (): void => {
    if (watchRef.current) clearInterval(watchRef.current);
    if (!endSeconds) return;
    watchRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const t = p.getCurrentTime?.();
        if (typeof t === "number" && t >= endSeconds) {
          if (!endedRef.current) {
            endedRef.current = true;
            onEnded();
          }
        }
      } catch {
        /* player API may throw while tearing down */
      }
    }, 500);
  };

  const handleReady = (e: YouTubeEvent): void => {
    playerRef.current = e.target;
    try {
      e.target.unMute();
      e.target.setVolume(80);
      e.target.playVideo();
    } catch {
      /* autoplay policies */
    }
  };

  const handleStateChange = (e: YouTubeEvent): void => {
    const s = e.data;
    if (s === 1) {
      timerStore.setPlaying(true);
      try {
        e.target.unMute();
      } catch {
        /* ignore */
      }
      startEnforced();
    } else if (s === 2 || s === 0) {
      timerStore.setPlaying(false);
      if (s === 0 && !endedRef.current) {
        endedRef.current = true;
        onEnded();
      }
    }
  };

  const handleError = (): void => {
    setError("Couldn't play this one — skipping to the next video…");
    setTimeout(() => {
      if (!endedRef.current) {
        endedRef.current = true;
        onEnded();
      }
    }, 1500);
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-inner ring-1 ring-black/10">
      <YouTube
        videoId={id}
        opts={{
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            start: startSeconds ?? undefined,
            end: endSeconds ?? undefined,
          },
        }}
        className="h-full w-full"
        iframeClassName="h-full w-full"
        onReady={handleReady}
        onStateChange={handleStateChange}
        onError={handleError}
        onEnd={() => {
          if (!endedRef.current) {
            endedRef.current = true;
            onEnded();
          }
        }}
      />
      {/* Transparent overlay blocks YouTube's end-screen recommendation clicks */}
      <div className="absolute inset-0" aria-hidden="true" />
      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-background/95 p-6 text-center backdrop-blur-sm">
          <p className="max-w-sm text-sm font-medium text-destructive">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
