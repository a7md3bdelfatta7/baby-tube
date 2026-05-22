"use client";

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Clapperboard, Play, Sparkles, Settings2 } from "lucide-react";
import { listVideos } from "@/lib/api";
import { extractVideoId, thumbnailFor } from "@/lib/youtube";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

const PASTELS = [
  { bg: "var(--tots-mint)", emoji: "🧸" },
  { bg: "var(--tots-sunshine)", emoji: "🌼" },
  { bg: "var(--tots-sky)", emoji: "⭐" },
  { bg: "var(--tots-peach)", emoji: "🦊" },
  { bg: "var(--tots-lavender)", emoji: "🦄" },
  { bg: "var(--tots-pink)", emoji: "🎀" },
] as const;

export default function HomePage(): ReactElement {
  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 md:pt-8">
      <TopNav />

      <Hero count={videos?.length ?? 0} />

      {isLoading && <VideoGridSkeleton />}

      {!isLoading && videos && videos.length === 0 && (
        <Alert className="mx-auto max-w-lg rounded-3xl border-2 border-dashed border-primary/30 bg-card/90 p-6 shadow-xl backdrop-blur-sm">
          <Clapperboard className="size-5 text-primary" />
          <AlertTitle className="font-display text-base">No videos yet</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Ask a grown-up to open Admin and import a playlist or add videos one
            by one.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && videos && videos.length > 0 ? (
        <section aria-labelledby="videos-heading" className="mt-2">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2
                id="videos-heading"
                className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl"
              >
                Today&apos;s playroom
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {videos.length} happy video{videos.length === 1 ? "" : "s"} ready
                to play
              </p>
            </div>
            <Badge
              variant="secondary"
              className="hidden rounded-full border-0 bg-white/70 px-4 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-black/[0.04] backdrop-blur sm:inline-flex"
            >
              <Sparkles className="mr-1.5 size-3.5 text-[color:var(--tots-ink)]" />
              hand-picked
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {videos.map((v, idx) => {
              const ytId = extractVideoId(v.videoUrl);
              const thumb =
                v.thumbnailUrl ?? (ytId ? thumbnailFor(ytId) : null);
              const tone = PASTELS[idx % PASTELS.length];
              return (
                <Link
                  key={v.id}
                  href={`/watch/${v.id}`}
                  className={cn(
                    "group block rounded-[2rem] outline-none transition-all duration-300",
                    "focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent",
                    "hover:-translate-y-1.5 hover:rotate-[-0.4deg]",
                    "animate-pop-in",
                  )}
                  style={{ animationDelay: `${Math.min(idx, 10) * 40}ms` }}
                >
                  <article
                    className={cn(
                      "relative h-full overflow-hidden rounded-[2rem] bg-white p-2.5 shadow-[0_18px_40px_-18px_rgba(80,90,160,0.35)] ring-1 ring-black/[0.04] transition-all duration-300",
                      "group-hover:shadow-[0_28px_50px_-18px_rgba(80,90,160,0.45)]",
                    )}
                  >
                    <div
                      className="relative aspect-video overflow-hidden rounded-[1.4rem]"
                      style={{ backgroundColor: `var(${"--pastel-blue" as const})`, background: `linear-gradient(135deg, ${tone.bg}, color-mix(in oklch, ${tone.bg} 60%, white))` }}
                    >
                      {thumb ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={thumb}
                          alt={v.title}
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-4xl">
                          <span aria-hidden>{tone.emoji}</span>
                        </div>
                      )}

                      {/* play button bubble */}
                      <div className="absolute inset-0 grid place-items-center">
                        <span
                          className={cn(
                            "flex size-14 items-center justify-center rounded-full bg-white/95 text-[color:var(--tots-ink)] shadow-xl ring-4 ring-white/40",
                            "scale-90 opacity-0 transition-all duration-300",
                            "group-hover:scale-100 group-hover:opacity-100",
                            "md:size-16",
                          )}
                        >
                          <Play
                            className="size-6 fill-current pl-0.5 md:size-7"
                            aria-hidden
                          />
                        </span>
                      </div>

                      {/* floating sticker */}
                      <span
                        className="absolute -right-1 -top-1 grid size-10 place-items-center rounded-full bg-white text-lg shadow-lg ring-2 ring-white/80 transition-transform duration-500 group-hover:rotate-12 md:size-11 md:text-xl"
                        aria-hidden
                      >
                        {tone.emoji}
                      </span>
                    </div>

                    <div className="px-1 pb-1 pt-3">
                      <h3 className="line-clamp-2 font-display text-[0.95rem] font-semibold leading-snug tracking-tight text-foreground md:text-base">
                        {v.title}
                      </h3>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function TopNav(): ReactElement {
  return (
    <div className="mb-8 flex items-center justify-between rounded-full border border-white/60 bg-white/75 px-3 py-2.5 shadow-[0_10px_30px_-15px_rgba(80,90,160,0.35)] ring-1 ring-black/[0.03] backdrop-blur-xl md:px-4 md:py-3">
      <BrandLogo size="md" />
      <Link
        href="/admin"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/80 px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition",
          "hover:-translate-y-0.5 hover:bg-white hover:shadow-md",
        )}
      >
        <Settings2 className="size-4 text-[color:var(--tots-ink)]" />
        <span className="hidden sm:inline">Parents</span>
      </Link>
    </div>
  );
}

function Hero({ count }: { count: number }): ReactElement {
  return (
    <header className="relative mb-10 overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/55 px-6 py-10 shadow-[0_30px_70px_-20px_rgba(61,61,92,0.18)] ring-1 ring-[color:var(--tots-ink)]/[0.04] backdrop-blur-xl md:px-12 md:py-14">
      {/* decorative pastel blobs */}
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[color:var(--tots-sunshine)] opacity-70 blur-3xl md:size-72" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full bg-[color:var(--tots-mint)] opacity-70 blur-3xl md:size-72" />
      <div className="pointer-events-none absolute right-1/4 -bottom-16 size-44 rounded-full bg-[color:var(--tots-lavender)] opacity-60 blur-3xl" />

      {/* hero teddy peek — official Tots character, only on md+ */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/tots-brand-kit/svg/tots-icon-transparent.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-4 bottom-4 hidden size-40 animate-float-slow opacity-95 md:block lg:size-48"
      />

      {/* floating sticker emojis */}
      <span
        className="pointer-events-none absolute right-6 top-6 hidden text-3xl animate-float-slow md:block"
        aria-hidden
      >
        ☁️
      </span>
      <span
        className="pointer-events-none absolute right-20 bottom-8 hidden text-2xl animate-float-slower md:block"
        aria-hidden
      >
        ⭐
      </span>
      <span
        className="pointer-events-none absolute left-8 top-10 hidden text-2xl animate-float-slower md:block"
        aria-hidden
      >
        🎈
      </span>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <Badge
          variant="secondary"
          className="mb-5 gap-2 rounded-full border-0 bg-white/85 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--tots-ink)] shadow-sm ring-1 ring-black/[0.04] backdrop-blur"
        >
          <Sparkles className="size-3.5" aria-hidden />
          {count > 0 ? `${count} shows ready` : "Welcome"}
        </Badge>

        <h1 className="text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--tots-ink)] md:text-5xl lg:text-6xl">
          Hi little star{" "}
          <span className="inline-block animate-wave" aria-hidden>
            👋
          </span>
          <br className="hidden sm:block" />
          let&apos;s watch something{" "}
          <span className="bg-[image:var(--tots-grad-sky-lavender)] bg-clip-text text-transparent">
            magical
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-md text-pretty text-base text-muted-foreground md:text-lg">
          Tap a happy bubble below — your show plays full screen on the next page.
        </p>
      </div>
    </header>
  );
}

function VideoGridSkeleton(): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[2rem] bg-white p-2.5 shadow-[0_18px_40px_-18px_rgba(80,90,160,0.35)] ring-1 ring-black/[0.04]"
        >
          <Skeleton className="aspect-video w-full rounded-[1.4rem]" />
          <div className="space-y-2 px-1 pb-1 pt-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
