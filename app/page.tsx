"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Baby,
  Clapperboard,
  Headphones,
  Play,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { ChildProfile, Video } from "@/db/schema";
import { formatAge } from "@/lib/age";
import { getProfiles, getQueue, listVideos } from "@/lib/api";
import { CONTENT_CATEGORIES, type ContentCategory } from "@/lib/categories";
import {
  filterVideosForProfile,
  setActiveChildProfileId,
  useActiveChildProfile,
} from "@/lib/profiles";
import { getVisibleVideos, setSessionPlaybackQueue } from "@/lib/queue";
import { extractVideoId, thumbnailFor } from "@/lib/youtube";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BrandLogo } from "@/components/BrandLogo";
import { WatchTimerCard } from "@/components/WatchTimer";
import { cn } from "@/lib/utils";

const PASTELS = [
  { bg: "var(--tots-mint)", emoji: "🧸" },
  { bg: "var(--tots-sunshine)", emoji: "🌼" },
  { bg: "var(--tots-sky)", emoji: "⭐" },
  { bg: "var(--tots-peach)", emoji: "🦊" },
  { bg: "var(--tots-lavender)", emoji: "🦄" },
  { bg: "var(--tots-pink)", emoji: "🎀" },
] as const;

type CategoryFilter = ContentCategory | "All" | "Uncategorized";

type CategoryFilterOption = {
  label: CategoryFilter;
  count: number;
};

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
  const { data: profiles, isLoading: isProfilesLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
  });
  const activeProfile = useActiveChildProfile(profiles?.childProfiles);
  const hasSongs = useMemo(
    () => (videos ?? []).some((video) => video.categories.includes("Songs")),
    [videos],
  );
  const visible = useMemo(
    () =>
      videos
        ? getVisibleVideos(videos, queue?.queueVideoIds ?? [])
        : { videos: [], isQueueActive: false },
    [queue, videos],
  );
  const profileVideos = useMemo(
    () => filterVideosForProfile(visible.videos, activeProfile),
    [activeProfile, visible.videos],
  );
  const categoryFilters = useMemo(
    () => buildCategoryFilters(profileVideos),
    [profileVideos],
  );
  const filteredVideos = useMemo(
    () => filterVideos(profileVideos, selectedCategory),
    [profileVideos, selectedCategory],
  );
  const isPageLoading = isLoading || isQueueLoading || isProfilesLoading;

  useEffect(() => {
    if (categoryFilters.some((option) => option.label === selectedCategory)) return;
    setSelectedCategory("All");
  }, [categoryFilters, selectedCategory]);

  const playCategory = (categoryVideos: Video[]): void => {
    const firstVideo = categoryVideos[0];
    if (!firstVideo) return;

    setSessionPlaybackQueue(categoryVideos.map((video) => video.id));
    router.push(`/watch/${firstVideo.id}?queue=session`);
  };

  return (
    <main className="mx-auto max-w-[1500px] px-4 pb-10 pt-4 md:px-6 md:pt-6">
      <TopNav hasSongs={hasSongs} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-labelledby="videos-heading" className="min-w-0">
          <LibraryHeader
            count={filteredVideos.length}
            totalCount={profileVideos.length}
            isQueueActive={visible.isQueueActive}
            selectedCategory={selectedCategory}
            onPlay={() => playCategory(filteredVideos)}
          />

          {profileVideos.length > 0 && (
            <CategoryFilterBar
              options={categoryFilters}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          )}

          {isPageLoading && <VideoGridSkeleton />}

          {!isPageLoading && videos && profileVideos.length === 0 && (
            <EmptyState hasVisibleVideos={visible.videos.length > 0} />
          )}

          {!isPageLoading && videos && profileVideos.length > 0 && (
            <VideoCardGrid videos={filteredVideos} />
          )}
        </section>

        <HomeSidebar
          profiles={profiles?.childProfiles ?? []}
          activeProfile={activeProfile}
          totalCount={profileVideos.length}
          filteredCount={filteredVideos.length}
          selectedCategory={selectedCategory}
          isQueueActive={visible.isQueueActive}
        />
      </div>
    </main>
  );
}

function LibraryHeader({
  count,
  totalCount,
  isQueueActive,
  selectedCategory,
  onPlay,
}: {
  count: number;
  totalCount: number;
  isQueueActive: boolean;
  selectedCategory: CategoryFilter;
  onPlay: () => void;
}): ReactElement {
  const title =
    selectedCategory === "All"
      ? isQueueActive
        ? "Today's queue"
        : "All videos"
      : selectedCategory;
  const subtitle =
    selectedCategory === "All"
      ? `${totalCount} happy video${totalCount === 1 ? "" : "s"} ready to play`
      : `${count} video${count === 1 ? "" : "s"} tagged ${selectedCategory}`;

  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        <Badge
          variant="secondary"
          className="mb-3 gap-2 rounded-full border-0 bg-white/75 px-3.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--tots-ink)] shadow-sm ring-1 ring-black/[0.04] backdrop-blur"
        >
          <Sparkles className="size-3.5" aria-hidden />
          {isQueueActive ? "parent-picked queue" : "kid-safe library"}
        </Badge>
        <h1
          id="videos-heading"
          className="font-display text-3xl font-bold tracking-tight text-[color:var(--tots-ink)] md:text-4xl"
        >
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onPlay}
        disabled={count === 0}
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-[color:var(--tots-ink)] px-4 py-2.5 text-sm font-semibold text-[color:var(--tots-cream)] shadow-sm transition",
          "hover:-translate-y-0.5 hover:brightness-110 disabled:pointer-events-none disabled:opacity-45",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40",
        )}
      >
        <Play className="size-4 fill-current" aria-hidden />
        Play all
      </button>
    </header>
  );
}

function EmptyState({
  hasVisibleVideos,
}: {
  hasVisibleVideos: boolean;
}): ReactElement {
  return (
    <Alert className="mx-auto mt-10 max-w-lg rounded-3xl border-2 border-dashed border-primary/30 bg-card/90 p-6 shadow-xl backdrop-blur-sm">
      <Clapperboard className="size-5 text-primary" />
      <AlertTitle className="font-display text-base">
        {hasVisibleVideos ? "No profile matches" : "No videos yet"}
      </AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {hasVisibleVideos
          ? "Ask a grown-up to add more preferred categories for this profile."
          : "Ask a grown-up to open Admin and import a playlist or add videos one by one."}
      </AlertDescription>
    </Alert>
  );
}

function HomeSidebar({
  profiles,
  activeProfile,
  totalCount,
  filteredCount,
  selectedCategory,
  isQueueActive,
}: {
  profiles: ChildProfile[];
  activeProfile: ChildProfile | null;
  totalCount: number;
  filteredCount: number;
  selectedCategory: CategoryFilter;
  isQueueActive: boolean;
}): ReactElement {
  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/70 p-4 shadow-[0_16px_40px_-24px_rgba(61,61,92,0.32)] ring-1 ring-black/[0.03] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/tots-brand-kit/svg/tots-icon-transparent.svg"
            alt=""
            aria-hidden
            className="size-14 shrink-0"
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {isQueueActive ? "Today only" : "Ready now"}
            </p>
            <h2 className="font-display text-xl font-bold leading-tight text-[color:var(--tots-ink)]">
              {filteredCount} of {totalCount} videos
            </h2>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {selectedCategory === "All"
            ? "Pick any thumbnail to start watching."
            : `Showing videos tagged ${selectedCategory}.`}
        </p>
      </section>

      <ProfileSelector profiles={profiles} activeProfile={activeProfile} />

      <WatchTimerCard />

      <Link
        href="/admin"
        className={cn(
          "flex items-center justify-between rounded-[1.5rem] border border-white/60 bg-white/70 px-4 py-3 text-sm font-semibold text-foreground shadow-[0_16px_40px_-24px_rgba(61,61,92,0.32)] ring-1 ring-black/[0.03] backdrop-blur-xl transition",
          "hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_42px_-24px_rgba(61,61,92,0.42)]",
        )}
      >
        <span className="inline-flex items-center gap-2">
          <Settings2 className="size-4 text-[color:var(--tots-ink)]" />
          Parents panel
        </span>
        <span aria-hidden>→</span>
      </Link>
    </aside>
  );
}

function ProfileSelector({
  profiles,
  activeProfile,
}: {
  profiles: ChildProfile[];
  activeProfile: ChildProfile | null;
}): ReactElement | null {
  if (profiles.length === 0) return null;

  return (
    <section
      aria-label="Choose child profile"
      className="rounded-[1.75rem] border border-white/60 bg-white/70 p-4 shadow-[0_16px_40px_-24px_rgba(61,61,92,0.32)] ring-1 ring-black/[0.03] backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Baby className="size-4 text-[color:var(--tots-ink)]" aria-hidden />
        Watching as
      </div>
      <div className="grid gap-2">
        {profiles.map((profile) => {
          const selected = profile.id === activeProfile?.id;
          const categories =
            profile.preferredCategories.length > 0
              ? profile.preferredCategories.join(", ")
              : "All categories";

          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => setActiveChildProfileId(profile.id)}
              className={cn(
                "rounded-2xl px-4 py-3 text-left shadow-sm ring-1 ring-black/[0.04] transition",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40",
                selected
                  ? "bg-[color:var(--tots-ink)] text-[color:var(--tots-cream)]"
                  : "bg-white/80 text-foreground hover:-translate-y-0.5 hover:bg-white",
              )}
              aria-pressed={selected}
            >
              <span className="block font-display text-base font-bold">
                {profile.name}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-xs",
                  selected
                    ? "text-[color:var(--tots-cream)]/75"
                    : "text-muted-foreground",
                )}
              >
                {formatAge(profile.birthDate)} · {categories}
              </span>
            </button>
          );
        })}
      </div>
    </section>
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
      className="sticky top-2 z-20 -mx-4 mb-5 overflow-x-auto px-4 pb-2 pt-1"
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

function VideoCardGrid({
  videos,
}: {
  videos: Video[];
}): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
      {videos.map((video, idx) => (
        <VideoCard key={video.id} video={video} index={idx} />
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
  const categories =
    video.categories.length > 0 ? video.categories : ["Uncategorized"];
  const visibleCategories = categories.slice(0, 2);
  const hiddenCategoryCount = categories.length - visibleCategories.length;

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
          "relative h-full overflow-hidden rounded-[1.5rem] bg-white/85 p-2 shadow-[0_14px_34px_-18px_rgba(80,90,160,0.35)] ring-1 ring-black/[0.04] transition-all duration-300",
          "group-hover:bg-white group-hover:shadow-[0_24px_46px_-20px_rgba(80,90,160,0.45)]",
        )}
      >
        <div
          className="relative aspect-video overflow-hidden rounded-[1.1rem]"
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

          <div className="absolute left-2 right-10 top-2 flex flex-wrap gap-1">
            {visibleCategories.map((category) => (
              <span
                key={category}
                className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[color:var(--tots-ink)] shadow-sm backdrop-blur"
              >
                {category}
              </span>
            ))}
            {hiddenCategoryCount > 0 && (
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[color:var(--tots-ink)] shadow-sm backdrop-blur">
                +{hiddenCategoryCount}
              </span>
            )}
          </div>

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
            className="absolute -right-1 -top-1 grid size-9 place-items-center rounded-full bg-white text-base shadow-lg ring-2 ring-white/80 transition-transform duration-500 group-hover:rotate-12 md:size-10 md:text-lg"
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

function TopNav({ hasSongs }: { hasSongs: boolean }): ReactElement {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-full border border-white/60 bg-white/75 px-3 py-2.5 shadow-[0_10px_30px_-15px_rgba(80,90,160,0.35)] ring-1 ring-black/[0.03] backdrop-blur-xl md:mb-6 md:px-4 md:py-3">
      <BrandLogo size="md" />
      <div className="flex items-center gap-2">
        {hasSongs ? (
          <Link
            href="/listen"
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-[color:var(--tots-ink)] px-4 py-2 text-xs font-semibold text-[color:var(--tots-cream)] shadow-sm transition",
              "hover:-translate-y-0.5 hover:brightness-110",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40",
            )}
            aria-label="Enter listening mode"
          >
            <Headphones className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Listening mode</span>
            <span className="sm:hidden">Listen</span>
          </Link>
        ) : null}
        <Badge
          variant="secondary"
          className="hidden rounded-full border-0 bg-white/70 px-4 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-black/[0.04] backdrop-blur sm:inline-flex"
        >
          <Sparkles className="mr-1.5 size-3.5 text-[color:var(--tots-ink)]" />
          Pick a happy show
        </Badge>
      </div>
    </div>
  );
}

function VideoGridSkeleton(): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[1.5rem] bg-white/85 p-2 shadow-[0_14px_34px_-18px_rgba(80,90,160,0.35)] ring-1 ring-black/[0.04]"
        >
          <Skeleton className="aspect-video w-full rounded-[1.1rem]" />
          <div className="space-y-2 px-1 pb-1 pt-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
