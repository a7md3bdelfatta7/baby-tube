"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clapperboard, Play, Sparkles, Settings2 } from "lucide-react";
import type { Video } from "@/db/schema";
import { getQueue, listVideos } from "@/lib/api";
import { CONTENT_CATEGORIES, type ContentCategory } from "@/lib/categories";
import { getVisibleVideos, setSessionPlaybackQueue } from "@/lib/queue";
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

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Songs: "Sing-along favorites and musical moments.",
  Learning: "Gentle videos for curious little minds.",
  Bedtime: "Calmer picks for winding down.",
  Arabic: "Arabic songs and stories for language time.",
  Animals: "Friendly creatures, pets, and nature clips.",
  "Short Clips": "Quick videos for smaller watch moments.",
  Uncategorized: "Videos waiting for a grown-up to sort.",
};

type VideoSection = {
  title: string;
  description: string;
  videos: Video[];
};

type CategoryFilter = ContentCategory | "All" | "Uncategorized";

type CategoryFilterOption = {
  label: CategoryFilter;
  count: number;
};

function buildVideoSections(videos: Video[]): VideoSection[] {
  const categorized = CONTENT_CATEGORIES.map((category) => ({
    title: category,
    description: CATEGORY_DESCRIPTIONS[category],
    videos: videos.filter((video) => video.categories.includes(category)),
  })).filter((section) => section.videos.length > 0);

  const uncategorized = videos.filter((video) => video.categories.length === 0);

  if (uncategorized.length === 0) return categorized;

  return [
    ...categorized,
    {
      title: "Uncategorized",
      description: CATEGORY_DESCRIPTIONS.Uncategorized,
      videos: uncategorized,
    },
  ];
}

function buildCategoryFilters(videos: Video[]): CategoryFilterOption[] {
  const categoryFilters = CONTENT_CATEGORIES.map((category) => ({
    label: category,
    count: videos.filter((video) => video.categories.includes(category)).length,
  })).filter((filter) => filter.count > 0);

  const uncategorizedCount = videos.filter(
    (video) => video.categories.length === 0,
  ).length;

  return [
    { label: "All", count: videos.length },
    ...categoryFilters,
    ...(uncategorizedCount > 0
      ? [{ label: "Uncategorized" as const, count: uncategorizedCount }]
      : []),
  ];
}

function filterVideos(videos: Video[], category: CategoryFilter): Video[] {
  if (category === "All") return videos;
  if (category === "Uncategorized") {
    return videos.filter((video) => video.categories.length === 0);
  }

  return videos.filter((video) => video.categories.includes(category));
}

export default function HomePage(): ReactElement {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("All");
  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });
  const { data: queue, isLoading: isQueueLoading } = useQuery({
    queryKey: ["queue"],
    queryFn: getQueue,
  });
  const visible = useMemo(
    () =>
      videos
        ? getVisibleVideos(videos, queue?.queueVideoIds ?? [])
        : { videos: [], isQueueActive: false },
    [queue, videos],
  );
  const sections = useMemo(
    () => buildVideoSections(visible.videos),
    [visible.videos],
  );
  const categoryFilters = useMemo(
    () => buildCategoryFilters(visible.videos),
    [visible.videos],
  );
  const filteredVideos = useMemo(
    () => filterVideos(visible.videos, selectedCategory),
    [selectedCategory, visible.videos],
  );
  const isPageLoading = isLoading || isQueueLoading;
  const playCategory = (categoryVideos: Video[]): void => {
    const firstVideo = categoryVideos[0];
    if (!firstVideo) return;

    setSessionPlaybackQueue(categoryVideos.map((video) => video.id));
    router.push(`/watch/${firstVideo.id}?queue=session`);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-4 md:pt-6">
      <TopNav />

      <Hero count={visible.videos.length} isQueueActive={visible.isQueueActive} />

      {isPageLoading && <VideoGridSkeleton />}

      {!isPageLoading && videos && visible.videos.length === 0 && (
        <Alert className="mx-auto max-w-lg rounded-3xl border-2 border-dashed border-primary/30 bg-card/90 p-6 shadow-xl backdrop-blur-sm">
          <Clapperboard className="size-5 text-primary" />
          <AlertTitle className="font-display text-base">No videos yet</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Ask a grown-up to open Admin and import a playlist or add videos one
            by one.
          </AlertDescription>
        </Alert>
      )}

      {!isPageLoading && videos && visible.videos.length > 0 ? (
        <section aria-labelledby="videos-heading" className="mt-2">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2
                id="videos-heading"
                className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl"
              >
                {visible.isQueueActive ? "Today's queue" : "Explore by category"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedCategory === "All"
                  ? `${visible.videos.length} happy video${visible.videos.length === 1 ? "" : "s"} ready to play`
                  : `${filteredVideos.length} video${filteredVideos.length === 1 ? "" : "s"} in ${selectedCategory}`}
              </p>
            </div>
            <Badge
              variant="secondary"
              className="hidden rounded-full border-0 bg-white/70 px-4 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-black/[0.04] backdrop-blur sm:inline-flex"
            >
              <Sparkles className="mr-1.5 size-3.5 text-[color:var(--tots-ink)]" />
              {visible.isQueueActive ? "parent-picked" : "hand-picked"}
            </Badge>
          </div>

          <CategoryFilterBar
            options={categoryFilters}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />

          {selectedCategory === "All" ? (
            <CategorySections sections={sections} onPlay={playCategory} />
          ) : (
            <FilteredVideoGrid
              category={selectedCategory}
              videos={filteredVideos}
              onPlay={playCategory}
            />
          )}
        </section>
      ) : null}
    </main>
  );
}

function CategoryFilterBar({
  options,
  selected,
  onSelect,
}: {
  options: CategoryFilterOption[];
  selected: CategoryFilter;
  onSelect: (category: CategoryFilter) => void;
}): ReactElement {
  return (
    <div
      className="mb-8 -mx-4 overflow-x-auto px-4 pb-2"
      aria-label="Filter videos by category"
    >
      <div className="flex min-w-max gap-2">
        {options.map((option) => {
          const isSelected = option.label === selected;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onSelect(option.label)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-sm ring-1 ring-black/[0.04] transition",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40",
                isSelected
                  ? "bg-[color:var(--tots-ink)] text-[color:var(--tots-cream)]"
                  : "bg-white/75 text-foreground backdrop-blur hover:-translate-y-0.5 hover:bg-white",
              )}
              aria-pressed={isSelected}
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  isSelected
                    ? "bg-white/15 text-[color:var(--tots-cream)]"
                    : "bg-[color:var(--tots-cream)] text-muted-foreground",
                )}
              >
                {option.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategorySections({
  sections,
  onPlay,
}: {
  sections: VideoSection[];
  onPlay: (videos: Video[]) => void;
}): ReactElement {
  return (
    <div className="space-y-10">
      {sections.map((section, sectionIndex) => {
        const headingId = `category-${section.title
          .toLowerCase()
          .replace(/\s+/g, "-")}`;

        return (
          <section key={section.title} aria-labelledby={headingId}>
            <CategorySectionHeader
              id={headingId}
              title={section.title}
              description={section.description}
              count={section.videos.length}
              onPlay={() => onPlay(section.videos)}
            />

            <VideoCardGrid videos={section.videos} indexOffset={sectionIndex} />
          </section>
        );
      })}
    </div>
  );
}

function FilteredVideoGrid({
  category,
  videos,
  onPlay,
}: {
  category: CategoryFilter;
  videos: Video[];
  onPlay: (videos: Video[]) => void;
}): ReactElement {
  return (
    <section aria-labelledby="filtered-videos-heading">
      <CategorySectionHeader
        id="filtered-videos-heading"
        title={category}
        description={CATEGORY_DESCRIPTIONS[category]}
        count={videos.length}
        onPlay={() => onPlay(videos)}
      />
      <VideoCardGrid videos={videos} indexOffset={0} />
    </section>
  );
}

function CategorySectionHeader({
  id,
  title,
  description,
  count,
  onPlay,
}: {
  id: string;
  title: string;
  description: string;
  count: number;
  onPlay: () => void;
}): ReactElement {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3
          id={id}
          className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl"
        >
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="rounded-full bg-white/70 px-3 py-1 text-xs"
        >
          {count} video{count === 1 ? "" : "s"}
        </Badge>
        <button
          type="button"
          onClick={onPlay}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-[color:var(--tots-ink)] px-3 py-1.5 text-xs font-semibold text-[color:var(--tots-cream)] shadow-sm transition",
            "hover:-translate-y-0.5 hover:brightness-110",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40",
          )}
          aria-label={`Play ${title} queue`}
        >
          <Play className="size-3.5 fill-current" aria-hidden />
          Play
        </button>
      </div>
    </div>
  );
}

function VideoCardGrid({
  videos,
  indexOffset,
}: {
  videos: Video[];
  indexOffset: number;
}): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
      {videos.map((video, idx) => (
        <VideoCard
          key={video.id}
          video={video}
          index={idx + indexOffset}
        />
      ))}
    </div>
  );
}

function VideoCard({
  video,
  index,
}: {
  video: Video;
  index: number;
}): ReactElement {
  const ytId = extractVideoId(video.videoUrl);
  const thumb = video.thumbnailUrl ?? (ytId ? thumbnailFor(ytId) : null);
  const tone = PASTELS[index % PASTELS.length];

  return (
    <Link
      href={`/watch/${video.id}`}
      className={cn(
        "group block rounded-[2rem] outline-none transition-all duration-300",
        "focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent",
        "hover:-translate-y-1.5 hover:rotate-[-0.4deg]",
        "animate-pop-in",
      )}
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      <article
        className={cn(
          "relative h-full overflow-hidden rounded-[2rem] bg-white p-2.5 shadow-[0_18px_40px_-18px_rgba(80,90,160,0.35)] ring-1 ring-black/[0.04] transition-all duration-300",
          "group-hover:shadow-[0_28px_50px_-18px_rgba(80,90,160,0.45)]",
        )}
      >
        <div
          className="relative aspect-video overflow-hidden rounded-[1.4rem]"
          style={{
            backgroundColor: "var(--pastel-blue)",
            background: `linear-gradient(135deg, ${tone.bg}, color-mix(in oklch, ${tone.bg} 60%, white))`,
          }}
        >
          {thumb ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={thumb}
              alt={video.title}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
            />
          ) : (
            <div className="grid h-full place-items-center text-4xl">
              <span aria-hidden>{tone.emoji}</span>
            </div>
          )}

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

          <span
            className="absolute -right-1 -top-1 grid size-10 place-items-center rounded-full bg-white text-lg shadow-lg ring-2 ring-white/80 transition-transform duration-500 group-hover:rotate-12 md:size-11 md:text-xl"
            aria-hidden
          >
            {tone.emoji}
          </span>
        </div>

        <div className="px-1 pb-1 pt-3">
          <h4 className="line-clamp-2 font-display text-[0.95rem] font-semibold leading-snug tracking-tight text-foreground md:text-base">
            {video.title}
          </h4>
        </div>
      </article>
    </Link>
  );
}

function TopNav(): ReactElement {
  return (
    <div className="mb-5 flex items-center justify-between rounded-full border border-white/60 bg-white/75 px-3 py-2.5 shadow-[0_10px_30px_-15px_rgba(80,90,160,0.35)] ring-1 ring-black/[0.03] backdrop-blur-xl md:mb-6 md:px-4 md:py-3">
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

function Hero({
  count,
  isQueueActive,
}: {
  count: number;
  isQueueActive: boolean;
}): ReactElement {
  return (
    <header className="relative mb-7 overflow-hidden rounded-[2rem] border border-white/60 bg-white/55 px-5 py-7 shadow-[0_24px_56px_-22px_rgba(61,61,92,0.18)] ring-1 ring-[color:var(--tots-ink)]/[0.04] backdrop-blur-xl md:mb-8 md:px-10 md:py-10">
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
        className="pointer-events-none absolute -right-3 bottom-3 hidden size-32 animate-float-slow opacity-95 md:block lg:size-40"
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
          className="mb-4 gap-2 rounded-full border-0 bg-white/85 px-3.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--tots-ink)] shadow-sm ring-1 ring-black/[0.04] backdrop-blur"
        >
          <Sparkles className="size-3.5" aria-hidden />
          {count > 0
            ? `${count} ${isQueueActive ? "queued" : "shows ready"}`
            : "Welcome"}
        </Badge>

        <h1 className="text-balance font-display text-3xl font-bold leading-[1.05] tracking-tight text-[color:var(--tots-ink)] md:text-4xl lg:text-5xl">
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

        <p className="mx-auto mt-4 max-w-md text-pretty text-sm text-muted-foreground md:text-base">
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
