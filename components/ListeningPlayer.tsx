"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { extractVideoId } from "@/lib/youtube";

type Props = {
  videoUrl: string;
  startSeconds?: number | null;
  endSeconds?: number | null;
  onEnded: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onReadyChange?: (isReady: boolean) => void;
  registerControls?: (controls: {
    play: () => void;
    pause: () => void;
  } | null) => void;
};

export function ListeningPlayer({
  videoUrl,
  startSeconds,
  endSeconds,
  onEnded,
  onPlayingChange,
  onReadyChange,
  registerControls,
}: Props): ReactElement | null {
  const id = extractVideoId(videoUrl);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const watchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedRef = useRef(false);

  const [, setTick] = useState(0);

  useEffect(() => {
    endedRef.current = false;
    onReadyChange?.(false);
    onPlayingChange?.(false);
    return () => {
      if (watchRef.current) clearInterval(watchRef.current);
    };
  }, [videoUrl, startSeconds, onPlayingChange, onReadyChange]);

  useEffect(() => {
    if (!registerControls) return;

    registerControls({
      play: () => {
        try {
          playerRef.current?.unMute();
          playerRef.current?.playVideo();
        } catch {
          /* ignore */
        }
      },
      pause: () => {
        try {
          playerRef.current?.pauseVideo();
        } catch {
          /* ignore */
        }
      },
    });

    return () => registerControls(null);
  }, [registerControls]);

  if (!id) {
    setTimeout(() => {
      if (!endedRef.current) {
        endedRef.current = true;
        onEnded();
      }
    }, 0);
    return null;
  }

  const startClipEnforcement = (): void => {
    if (watchRef.current) clearInterval(watchRef.current);
    if (!endSeconds) return;

    watchRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        const t = player.getCurrentTime?.();
        if (typeof t === "number" && t >= endSeconds) {
          if (!endedRef.current) {
            endedRef.current = true;
            onEnded();
          }
        }
      } catch {
        /* ignore */
      }
    }, 500);
  };

  const handleReady = (e: YouTubeEvent): void => {
    playerRef.current = e.target;
    onReadyChange?.(true);
    try {
      e.target.mute();
      e.target.setVolume(80);
      e.target.playVideo();
    } catch {
      /* ignore */
    }
  };

  const handleStateChange = (e: YouTubeEvent): void => {
    const s = e.data;
    if (s === 1) {
      onPlayingChange?.(true);
      try {
        e.target.unMute();
      } catch {
        /* ignore */
      }
      startClipEnforcement();
    } else if (s === 2) {
      onPlayingChange?.(false);
    } else if (s === 0) {
      onPlayingChange?.(false);
      if (!endedRef.current) {
        endedRef.current = true;
        onEnded();
      }
    }
  };

  const handleError = (): void => {
    setTimeout(() => {
      if (!endedRef.current) {
        endedRef.current = true;
        onEnded();
      }
    }, 800);
  };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      style={{ left: -9999, top: -9999 }}
    >
      <YouTube
        videoId={id}
        opts={{
          width: "1",
          height: "1",
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
    </div>
  );
}
