"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ChildProfile, WatchHistoryEntry } from "@/db/schema";
import { formatAge } from "@/lib/age";
import { getProfiles, listVideos } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AdminCard, formatDuration } from "./shared";

type VideoInsight = {
  videoId: number;
  title: string;
  count: number;
};

type ProfileInsight = {
  profile: ChildProfile;
  watchedToday: number;
  completedToday: number;
  skippedToday: number;
  screenTimeSecondsToday: number;
  lastWatched: WatchHistoryEntry | null;
  favorites: VideoInsight[];
  skippedVideos: VideoInsight[];
};

function isToday(isoDate: string): boolean {
  const value = new Date(isoDate);
  const now = new Date();

  return (
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate()
  );
}

function formatWatchedAt(isoDate: string): string {
  return new Date(isoDate).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function collectVideoInsights(
  entries: readonly WatchHistoryEntry[],
  filter: (entry: WatchHistoryEntry) => boolean = () => true,
): VideoInsight[] {
  const counts = new Map<number, VideoInsight>();

  entries.filter(filter).forEach((entry) => {
    const current = counts.get(entry.videoId);
    counts.set(entry.videoId, {
      videoId: entry.videoId,
      title: entry.title,
      count: (current?.count ?? 0) + 1,
    });
  });

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 3);
}

function buildProfileInsight(profile: ChildProfile): ProfileInsight {
  const todayEntries = profile.watchHistory.filter((entry) =>
    isToday(entry.watchedAt),
  );

  return {
    profile,
    watchedToday: todayEntries.length,
    completedToday: todayEntries.filter((entry) => entry.status === "completed")
      .length,
    skippedToday: todayEntries.filter((entry) => entry.status === "skipped")
      .length,
    screenTimeSecondsToday: todayEntries.reduce(
      (total, entry) => total + entry.watchedSeconds,
      0,
    ),
    lastWatched: profile.watchHistory[0] ?? null,
    favorites: collectVideoInsights(profile.watchHistory),
    skippedVideos: collectVideoInsights(
      profile.watchHistory,
      (entry) => entry.status === "skipped",
    ),
  };
}

export function ParentDashboard(): ReactElement {
  const { data: profilesState, isLoading: profilesLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
  });
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });
  const profiles = profilesState?.childProfiles ?? [];
  const profileInsights = useMemo(
    () => profiles.map(buildProfileInsight),
    [profiles],
  );
  const allHistory = useMemo(
    () =>
      profiles
        .flatMap((profile) => profile.watchHistory)
        .sort(
          (a, b) =>
            new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime(),
        ),
    [profiles],
  );
  const todaysHistory = useMemo(
    () => allHistory.filter((entry) => isToday(entry.watchedAt)),
    [allHistory],
  );
  const screenTimeToday = todaysHistory.reduce(
    (total, entry) => total + entry.watchedSeconds,
    0,
  );
  const favoriteVideos = collectVideoInsights(allHistory);
  const skippedVideos = collectVideoInsights(
    allHistory,
    (entry) => entry.status === "skipped",
  );
  const lastWatched = allHistory[0] ?? null;
  const isLoading = profilesLoading || videosLoading;

  if (isLoading) {
    return (
      <AdminCard>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading dashboard…
        </CardContent>
      </AdminCard>
    );
  }

  return (
    <div className="space-y-5">
      <AdminCard>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Parent dashboard</CardTitle>
              <CardDescription>
                Lightweight watch insights for today and recent family patterns.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="rounded-full">
              {videos?.length ?? 0} library videos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard label="Watched today" value={String(todaysHistory.length)} />
          <InsightCard
            label="Screen time used"
            value={formatDuration(screenTimeToday)}
          />
          <InsightCard
            label="Skipped today"
            value={String(
              todaysHistory.filter((entry) => entry.status === "skipped").length,
            )}
          />
          <InsightCard
            label="Last watched"
            value={lastWatched ? lastWatched.title : "No history yet"}
            detail={lastWatched ? formatWatchedAt(lastWatched.watchedAt) : undefined}
          />
        </CardContent>
      </AdminCard>

      {profiles.length === 0 ? (
        <Card className="rounded-[1.75rem] border-dashed bg-white/70 shadow-none">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Add child profiles to start collecting parent dashboard insights.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="grid gap-4" aria-label="Profile insights">
            {profileInsights.map((insight) => (
              <ProfileInsightCard key={insight.profile.id} insight={insight} />
            ))}
          </section>

          <aside className="space-y-4">
            <VideoInsightList title="Favorite videos" items={favoriteVideos} />
            <VideoInsightList title="Most skipped" items={skippedVideos} />
          </aside>
        </div>
      )}
    </div>
  );
}

function InsightCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}): ReactElement {
  return (
    <div className="rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-black/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 line-clamp-2 font-display text-2xl font-bold text-[color:var(--tots-ink)]">
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function ProfileInsightCard({ insight }: { insight: ProfileInsight }): ReactElement {
  const dailyLimitSeconds = insight.profile.screenTimeMinutes * 60;
  const screenTimePercent =
    dailyLimitSeconds > 0
      ? Math.min(
          100,
          Math.round((insight.screenTimeSecondsToday / dailyLimitSeconds) * 100),
        )
      : 0;

  return (
    <AdminCard>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{insight.profile.name}</CardTitle>
            <CardDescription>
              {formatAge(insight.profile.birthDate)} ·{" "}
              {insight.profile.screenTimeMinutes}m daily limit
            </CardDescription>
          </div>
          <Badge variant="secondary" className="rounded-full">
            {insight.watchedToday} watched today
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <InsightCard
            label="Screen time"
            value={formatDuration(insight.screenTimeSecondsToday)}
            detail={`${screenTimePercent}% of limit`}
          />
          <InsightCard
            label="Completed"
            value={String(insight.completedToday)}
            detail="today"
          />
          <InsightCard
            label="Skipped"
            value={String(insight.skippedToday)}
            detail="today"
          />
        </div>

        <div className="overflow-hidden rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-[color:var(--tots-ink)] transition-[width]"
            style={{ width: `${screenTimePercent}%` }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-sm font-medium">Last watched</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {insight.lastWatched
                ? `${insight.lastWatched.title} · ${formatWatchedAt(
                    insight.lastWatched.watchedAt,
                  )}`
                : "No watched videos yet."}
            </p>
          </div>
          <VideoInsightList title="Favorites" items={insight.favorites} compact />
          <VideoInsightList title="Skipped videos" items={insight.skippedVideos} compact />
        </div>
      </CardContent>
    </AdminCard>
  );
}

function VideoInsightList({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: VideoInsight[];
  compact?: boolean;
}): ReactElement {
  return (
    <div className="rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-black/[0.04]">
      <p className="text-sm font-semibold">{title}</p>
      {items.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.videoId} className="flex items-start justify-between gap-3">
              <span
                className={cn(
                  "min-w-0 text-sm text-muted-foreground",
                  compact ? "line-clamp-2" : "line-clamp-3",
                )}
              >
                {item.title}
              </span>
              <Badge variant="secondary" className="shrink-0 rounded-full">
                {item.count}x
              </Badge>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
      )}
    </div>
  );
}
