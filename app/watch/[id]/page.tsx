"use client";

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";
import { ArrowLeft, Home, SkipForward } from "lucide-react";
import { BreakModeScreen } from "@/components/BreakModeScreen";
import { Player } from "@/components/Player";
import { getQueue, listVideos } from "@/lib/api";
import { getSessionPlaybackQueue, getVisibleVideos } from "@/lib/queue";
import { useWatchTimer } from "@/lib/timer-store";
import { extractVideoId, thumbnailFor } from "@/lib/youtube";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PASTELS = [
  "var(--tots-mint)",
  "var(--tots-sunshine)",
  "var(--tots-sky)",
  "var(--tots-peach)",
  "var(--tots-lavender)",
  "var(--tots-pink)",
] as const;

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
  const { expired } = useWatchTimer();
  const [sessionQueueIds] = useState<number[]>(() => getSessionPlaybackQueue());
  const useSessionQueue = queueMode === "session";

  const { data: videos } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });
  const { data: queue, isLoading: isQueueLoading } = useQuery({
    queryKey: ["queue"],
    queryFn: getQueue,
  });

  const { current, currentIdx, next, prev, isLast, isQueueActive } = useMemo(() => {
    if (!videos) {
      return {
        current: null,
        currentIdx: -1,
        next: null,
        prev: null,
        isLast: false,
        isQueueActive: false,
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
      prev: idx > 0 ? visible.videos[idx - 1] : null,
      isLast: idx === visible.videos.length - 1,
      isQueueActive: visible.isQueueActive,
    };
  }, [id, queue, sessionQueueIds, useSessionQueue, videos]);

  const goNext = (): void => {
    const queueSuffix = useSessionQueue ? "?queue=session" : "";
    if (next) router.push(`/watch/${next.id}${queueSuffix}`);
    else router.push("/");
  };

  if (!videos || isQueueLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 md:pt-8">
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
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 md:pt-8">
      {/* Top nav pill */}
      <div className="mb-6 flex items-center justify-between gap-3 rounded-full border border-white/60 bg-white/75 px-2 py-2 shadow-[0_10px_30px_-15px_rgba(80,90,160,0.35)] ring-1 ring-black/[0.03] backdrop-blur-xl md:px-3">
        <Link
          href="/"
          className={cn(
            "inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-black/[0.05] transition",
            "hover:-translate-y-0.5 hover:shadow-md",
          )}
        >
          <ArrowLeft className="size-4 text-[color:var(--tots-ink)]" />
          Home
        </Link>
        <button
          type="button"
          onClick={goNext}
          className={cn(
            "inline-flex items-center gap-2 rounded-full bg-[color:var(--tots-ink)] px-5 py-2.5 text-sm font-semibold text-[color:var(--tots-cream)] shadow-lg shadow-[color:var(--tots-ink)]/25 transition",
            "hover:-translate-y-0.5 hover:brightness-110",
          )}
        >
          {next ? "Next show" : "Finish"}
          <SkipForward className="size-4" />
        </button>
      </div>

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
          <BreakModeScreen />
        ) : (
          <div className="overflow-hidden rounded-[1.4rem]">
            <Player
              key={current.id}
              videoUrl={current.videoUrl}
              startSeconds={current.startSeconds}
              endSeconds={current.endSeconds}
              onEnded={goNext}
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

      {/* Up next / replay */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {next && (
          <UpNextCard
            label="Up next"
            video={next}
            accent={PASTELS[(currentIdx + 1) % PASTELS.length]}
            preserveSessionQueue={useSessionQueue}
          />
        )}
        {!next && isLast && prev && (
          <UpNextCard
            label="Watch again"
            video={prev}
            accent={PASTELS[(currentIdx + 5) % PASTELS.length]}
            preserveSessionQueue={useSessionQueue}
          />
        )}
      </div>
    </main>
  );
}

function UpNextCard({
  label,
  video,
  accent,
  preserveSessionQueue,
}: {
  label: string;
  video: {
    id: number;
    title: string;
    videoUrl: string;
    thumbnailUrl: string | null;
  };
  accent: string;
  preserveSessionQueue: boolean;
}): ReactElement {
  const ytId = extractVideoId(video.videoUrl);
  const thumb = video.thumbnailUrl ?? (ytId ? thumbnailFor(ytId) : null);
  const href = `/watch/${video.id}${preserveSessionQueue ? "?queue=session" : ""}`;
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-[1.75rem] outline-none transition-all",
        "focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40 focus-visible:ring-offset-2",
        "hover:-translate-y-1",
      )}
    >
      <div className="overflow-hidden rounded-[1.75rem] bg-white p-2.5 shadow-[0_18px_40px_-18px_rgba(80,90,160,0.35)] ring-1 ring-black/[0.04] transition-shadow group-hover:shadow-[0_24px_50px_-18px_rgba(80,90,160,0.45)]">
        <div className="flex items-center gap-3">
          <div
            className="relative h-[5.5rem] w-[9rem] shrink-0 overflow-hidden rounded-[1.2rem] ring-1 ring-black/[0.05]"
            style={{
              background: `linear-gradient(135deg, ${accent}, color-mix(in oklch, ${accent} 50%, white))`,
            }}
          >
            {thumb ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={thumb}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 py-1 pr-2">
            <p
              className="text-[0.65rem] font-bold uppercase tracking-[0.18em]"
              style={{ color: "color-mix(in oklch, var(--primary) 80%, black)" }}
            >
              {label}
            </p>
            <p className="mt-1 line-clamp-2 font-display font-semibold leading-snug text-foreground">
              {video.title}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
