"use client";

import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { useEffect, useRef, useState } from "react";
import { extractVideoId } from "@/lib/youtube";
import { timerStore } from "@/lib/timer-store";

type Props = {
  videoUrl: string;
  startSeconds?: number | null;
  endSeconds?: number | null;
  onEnded: () => void;
};

export function Player({ videoUrl, startSeconds, endSeconds, onEnded }: Props) {
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
      <div className="aspect-video rounded-3xl bg-pink-100 grid place-items-center text-pink-700">
        Couldn&apos;t read this video link 😿
      </div>
    );
  }

  const startEnforced = () => {
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
      } catch {}
    }, 500);
  };

  const handleReady = (e: YouTubeEvent) => {
    playerRef.current = e.target;
    try {
      e.target.unMute();
      e.target.setVolume(80);
      e.target.playVideo();
    } catch {}
  };

  const handleStateChange = (e: YouTubeEvent) => {
    // 1 = playing, 2 = paused, 0 = ended, 3 = buffering
    const s = e.data;
    if (s === 1) {
      timerStore.setPlaying(true);
      // ensure unmuted on first play
      try {
        e.target.unMute();
      } catch {}
      startEnforced();
    } else if (s === 2 || s === 0) {
      timerStore.setPlaying(false);
      if (s === 0 && !endedRef.current) {
        endedRef.current = true;
        onEnded();
      }
    }
  };

  const handleError = () => {
    setError("Couldn't play this one 😿 — skipping...");
    setTimeout(() => {
      if (!endedRef.current) {
        endedRef.current = true;
        onEnded();
      }
    }, 1500);
  };

  return (
    <div className="relative aspect-video w-full rounded-3xl overflow-hidden shadow-xl border-4 border-white">
      <YouTube
        videoId={id}
        opts={{
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            mute: 1, // browsers require mute to autoplay; we unmute on ready
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
        className="w-full h-full"
        iframeClassName="w-full h-full"
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
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-pink-50/95 text-pink-700 font-bold">
          {error}
        </div>
      )}
    </div>
  );
}
