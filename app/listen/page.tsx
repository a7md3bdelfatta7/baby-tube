"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Home, Pause, Play, SkipForward } from "lucide-react";
import type { Video } from "@/db/schema";
import { listVideos } from "@/lib/api";
import { ListeningPlayer } from "@/components/ListeningPlayer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SONGS_CATEGORY = "Songs";

function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function ListenPage(): ReactElement {
  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });

  const songs = useMemo<Video[]>(
    () =>
      videos?.filter((v) => v.categories.includes(SONGS_CATEGORY)) ?? [],
    [videos],
  );

  const [order, setOrder] = useState<Video[]>([]);
  const [index, setIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const controlsRef = useRef<{ play: () => void; pause: () => void } | null>(
    null,
  );

  useEffect(() => {
    if (songs.length === 0) {
      setOrder([]);
      setIndex(0);
      return;
    }
    setOrder(shuffle(songs));
    setIndex(0);
  }, [songs]);

  const current = order[index];

  const advance = useCallback((): void => {
    setIsReady(false);
    setIsPlaying(false);
    setIndex((prev) => {
      const next = prev + 1;
      if (next >= order.length) {
        // reshuffle and start over so it never stops and stays fresh
        setOrder((existing) =>
          existing.length > 1 ? shuffle(existing) : existing,
        );
        return 0;
      }
      return next;
    });
  }, [order.length]);

  const registerControls = useCallback(
    (controls: { play: () => void; pause: () => void } | null) => {
      controlsRef.current = controls;
    },
    [],
  );

  const togglePlay = (): void => {
    if (!controlsRef.current) return;
    if (isPlaying) controlsRef.current.pause();
    else controlsRef.current.play();
  };

  return (
    <main
      className={cn(
        "relative flex min-h-screen flex-col overflow-hidden",
        "bg-gradient-to-br from-[color:var(--tots-lavender)] via-[color:var(--tots-sky)] to-[color:var(--tots-mint)]",
      )}
    >

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-4 md:px-6 md:pt-6">
        <Link
          href="/"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-2 text-sm font-semibold text-[color:var(--tots-ink)] shadow-sm ring-1 ring-black/[0.04] backdrop-blur transition",
            "hover:-translate-y-0.5 hover:bg-white",
          )}
        >
          <Home className="size-4" aria-hidden />
          Home
        </Link>
        <span className="rounded-full border-0 bg-white/70 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--tots-ink)] shadow-sm ring-1 ring-black/[0.04] backdrop-blur">
          Listening mode
        </span>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <Visualizer isPlaying={isPlaying} />

        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-[color:var(--tots-ink)] md:text-3xl">
          {isLoading
            ? "Loading songs…"
            : songs.length === 0
              ? "No songs yet"
              : current
                ? current.title
                : "Getting ready…"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {songs.length === 0
            ? "Ask a grown-up to add videos tagged Songs."
            : `Song ${Math.min(index + 1, order.length)} of ${order.length} · Loops forever`}
        </p>

        {current ? (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              disabled={!isReady}
              onClick={togglePlay}
              className="size-14 rounded-full bg-white/95 text-[color:var(--tots-ink)] shadow-xl hover:bg-white"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="size-6 fill-current" aria-hidden />
              ) : (
                <Play className="size-6 fill-current" aria-hidden />
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              onClick={advance}
              className="size-14 rounded-full bg-[color:var(--tots-sunshine)] text-[color:var(--tots-ink)] shadow-xl hover:brightness-105"
              aria-label="Next song"
            >
              <SkipForward className="size-6 fill-current" aria-hidden />
            </Button>
          </div>
        ) : null}
      </section>

      {current ? (
        <ListeningPlayer
          key={`${current.id}-${index}`}
          videoUrl={current.videoUrl}
          startSeconds={current.startSeconds}
          endSeconds={current.endSeconds}
          onEnded={advance}
          onPlayingChange={setIsPlaying}
          onReadyChange={setIsReady}
          registerControls={registerControls}
        />
      ) : null}
    </main>
  );
}

function Visualizer({ isPlaying }: { isPlaying: boolean }): ReactElement {
  return (
    <div
      aria-hidden
      className={cn(
        "relative grid size-56 place-items-center rounded-full ring-4 ring-white/70 md:size-64",
        isPlaying && "listen-pulse",
      )}
      style={{
        background:
          "linear-gradient(135deg, var(--tots-pink), var(--tots-lavender) 55%, var(--tots-sky))",
        boxShadow: "0 20px 60px -10px rgba(80, 90, 160, 0.35)",
      }}
    >
      <div className="relative z-10 text-6xl md:text-7xl" aria-hidden>
        <span className={cn(isPlaying && "listen-bounce")}>🎵</span>
      </div>
      {isPlaying ? (
        <>
          <span className="listen-note listen-note-1" aria-hidden>
            ♪
          </span>
          <span className="listen-note listen-note-2" aria-hidden>
            ♫
          </span>
          <span className="listen-note listen-note-3" aria-hidden>
            ♩
          </span>
        </>
      ) : null}
    </div>
  );
}
