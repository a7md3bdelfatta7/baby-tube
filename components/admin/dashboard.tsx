"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ChildProfile, Video, WatchHistoryEntry } from "@/db/schema";
import { formatAge } from "@/lib/age";
import { getProfiles, listVideos } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AdminCard, formatDuration } from "./shared";

type Range = "today" | "7d" | "30d";

const RANGE_DAYS: Record<Range, number> = { today: 1, "7d": 7, "30d": 30 };
const RANGE_LABELS: Record<Range, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

type VideoInsight = {
  videoId: number;
  title: string;
  count: number;
};

type CategoryInsight = {
  category: string;
  count: number;
};

type TrendPoint = {
  date: string;
  label: string;
  seconds: number;
};

type ProfileInsight = {
  profile: ChildProfile;
  watched: number;
  completed: number;
  skipped: number;
  screenTimeSeconds: number;
  avgDailySeconds: number;
  daysUnderLimit: number;
  daysTracked: number;
  lastWatched: WatchHistoryEntry | null;
  favorites: VideoInsight[];
  skippedVideos: VideoInsight[];
  topCategories: CategoryInsight[];
  trend: TrendPoint[];
};

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isWithinRange(isoDate: string, days: number): boolean {
  const value = startOfDay(new Date(isoDate)).getTime();
  const cutoff = startOfDay(new Date()).getTime() - (days - 1) * 86_400_000;

  return value >= cutoff;
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

function collectCategoryInsights(
  entries: readonly WatchHistoryEntry[],
  categoriesByVideoId: Map<number, string[]>,
): CategoryInsight[] {
  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    const categories = categoriesByVideoId.get(entry.videoId) ?? [];
    (categories.length > 0 ? categories : ["Uncategorized"]).forEach((category) => {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
    .slice(0, 3);
}

function buildTrend(entries: readonly WatchHistoryEntry[], days: number): TrendPoint[] {
  const seconds = new Map<string, number>();

  entries.forEach((entry) => {
    const key = startOfDay(new Date(entry.watchedAt)).toISOString().slice(0, 10);
    seconds.set(key, (seconds.get(key) ?? 0) + entry.watchedSeconds);
  });

  return Array.from({ length: days }, (_, index) => {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);

    return {
      date: key,
      label: date.toLocaleDateString([], { weekday: "short", day: "numeric" }),
      seconds: seconds.get(key) ?? 0,
    };
  });
}

function buildProfileInsight(
  profile: ChildProfile,
  range: Range,
  categoriesByVideoId: Map<number, string[]>,
): ProfileInsight {
  const days = RANGE_DAYS[range];
  const rangeEntries = profile.watchHistory.filter((entry) =>
    isWithinRange(entry.watchedAt, days),
  );
  const dailyLimitSeconds = profile.screenTimeMinutes * 60;
  const trend = buildTrend(profile.watchHistory, Math.max(days, 7));
  const trackedDays = trend.filter((point) => point.seconds > 0);
  const daysUnderLimit = trackedDays.filter(
    (point) => dailyLimitSeconds === 0 || point.seconds <= dailyLimitSeconds,
  ).length;

  return {
    profile,
    watched: rangeEntries.length,
    completed: rangeEntries.filter((entry) => entry.status === "completed").length,
    skipped: rangeEntries.filter((entry) => entry.status === "skipped").length,
    screenTimeSeconds: rangeEntries.reduce(
      (total, entry) => total + entry.watchedSeconds,
      0,
    ),
    avgDailySeconds:
      trackedDays.length > 0
        ? Math.round(
            trackedDays.reduce((total, point) => total + point.seconds, 0) /
              trackedDays.length,
          )
        : 0,
    daysUnderLimit,
    daysTracked: trackedDays.length,
    lastWatched: profile.watchHistory[0] ?? null,
    favorites: collectVideoInsights(rangeEntries),
    skippedVideos: collectVideoInsights(
      rangeEntries,
      (entry) => entry.status === "skipped",
    ),
    topCategories: collectCategoryInsights(rangeEntries, categoriesByVideoId),
    trend,
  };
}

export function ParentDashboard(): ReactElement {
  const [range, setRange] = useState<Range>("today");
  const { data: profilesState, isLoading: profilesLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
  });
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });
  const profiles = profilesState?.childProfiles ?? [];
  const categoriesByVideoId = useMemo(
    () => new Map((videos ?? []).map((video: Video) => [video.id, video.categories])),
    [videos],
  );
  const profileInsights = useMemo(
    () => profiles.map((profile) => buildProfileInsight(profile, range, categoriesByVideoId)),
    [profiles, range, categoriesByVideoId],
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
  const rangeHistory = useMemo(
    () => allHistory.filter((entry) => isWithinRange(entry.watchedAt, RANGE_DAYS[range])),
    [allHistory, range],
  );
  const screenTimeInRange = rangeHistory.reduce(
    (total, entry) => total + entry.watchedSeconds,
    0,
  );
  const favoriteVideos = collectVideoInsights(rangeHistory);
  const skippedVideos = collectVideoInsights(
    rangeHistory,
    (entry) => entry.status === "skipped",
  );
  const topCategories = collectCategoryInsights(rangeHistory, categoriesByVideoId);
  const lastWatched = allHistory[0] ?? null;
  const watchedVideoIds = new Set(allHistory.map((entry) => entry.videoId));
  const libraryCoverage = videos?.length
    ? Math.round((watchedVideoIds.size / videos.length) * 100)
    : 0;
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
                Watch insights for {RANGE_LABELS[range].toLowerCase()}.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RangeToggle range={range} onChange={setRange} />
              <Badge variant="secondary" className="rounded-full">
                {videos?.length ?? 0} library videos
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard label="Watched" value={String(rangeHistory.length)} />
          <InsightCard
            label="Screen time used"
            value={formatDuration(screenTimeInRange)}
          />
          <InsightCard
            label="Skipped"
            value={String(
              rangeHistory.filter((entry) => entry.status === "skipped").length,
            )}
          />
          <InsightCard
            label="Library watched"
            value={`${libraryCoverage}%`}
            detail={`${watchedVideoIds.size} of ${videos?.length ?? 0} videos`}
          />
        </CardContent>
        {topCategories.length > 0 ? (
          <CardContent className="pt-0">
            <VideoInsightList title="Top categories" items={topCategories} compact />
          </CardContent>
        ) : null}
      </AdminCard>

      {profiles.length === 0 ? (
        <Card className="rounded-[1.75rem] border-dashed bg-card/70 shadow-none">
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

function RangeToggle({
  range,
  onChange,
}: {
  range: Range;
  onChange: (range: Range) => void;
}): ReactElement {
  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
      {(Object.keys(RANGE_LABELS) as Range[]).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            value === range
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === "today" ? "Today" : value}
        </button>
      ))}
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
    <div className="rounded-2xl bg-card/70 p-4 shadow-sm ring-1 ring-black/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 line-clamp-2 font-display text-2xl font-bold text-foreground">
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function TrendChart({ trend }: { trend: TrendPoint[] }): ReactElement {
  const max = Math.max(...trend.map((point) => point.seconds), 1);

  return (
    <div className="rounded-2xl bg-muted/40 p-4">
      <p className="text-sm font-medium">Screen time trend</p>
      <div className="mt-3 flex items-stretch gap-1.5" style={{ height: "4.5rem" }}>
        {trend.map((point) => (
          <div
            key={point.date}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
            title={`${point.label}: ${formatDuration(point.seconds)}`}
          >
            <div className="flex h-full w-full items-end">
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${Math.max((point.seconds / max) * 100, point.seconds > 0 ? 6 : 0)}%`,
                  backgroundColor: "var(--tots-ink)",
                  opacity: 0.7,
                }}
              />
            </div>
            <span className="text-[0.6rem] text-muted-foreground">
              {point.label.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileInsightCard({ insight }: { insight: ProfileInsight }): ReactElement {
  const dailyLimitSeconds = insight.profile.screenTimeMinutes * 60;
  const screenTimePercent =
    dailyLimitSeconds > 0
      ? Math.min(100, Math.round((insight.screenTimeSeconds / dailyLimitSeconds) * 100))
      : 0;
  const completionRate =
    insight.completed + insight.skipped > 0
      ? Math.round((insight.completed / (insight.completed + insight.skipped)) * 100)
      : null;
  const adherencePercent =
    insight.daysTracked > 0
      ? Math.round((insight.daysUnderLimit / insight.daysTracked) * 100)
      : null;

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
            {insight.watched} watched
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard
            label="Screen time"
            value={formatDuration(insight.screenTimeSeconds)}
            detail={`${screenTimePercent}% of limit`}
          />
          <InsightCard
            label="Avg per day"
            value={formatDuration(insight.avgDailySeconds)}
            detail={`${insight.daysTracked} active day${insight.daysTracked === 1 ? "" : "s"}`}
          />
          <InsightCard
            label="Completion rate"
            value={completionRate !== null ? `${completionRate}%` : "—"}
            detail={`${insight.completed} completed / ${insight.skipped} skipped`}
          />
          <InsightCard
            label="Under limit"
            value={adherencePercent !== null ? `${adherencePercent}%` : "—"}
            detail="of active days"
          />
        </div>

        <div className="overflow-hidden rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-[color:var(--tots-ink)] transition-[width]"
            style={{ width: `${screenTimePercent}%` }}
          />
        </div>

        <TrendChart trend={insight.trend} />

        <div className="grid gap-4 md:grid-cols-4">
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
          <VideoInsightList title="Top categories" items={insight.topCategories} compact />
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
  items: (VideoInsight | CategoryInsight)[];
  compact?: boolean;
}): ReactElement {
  return (
    <div className="rounded-2xl bg-card/70 p-4 shadow-sm ring-1 ring-black/[0.04]">
      <p className="text-sm font-semibold">{title}</p>
      {items.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {items.map((item) => {
            const key = "videoId" in item ? item.videoId : item.category;
            const label = "title" in item ? item.title : item.category;

            return (
              <li key={key} className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "min-w-0 text-sm text-muted-foreground",
                    compact ? "line-clamp-2" : "line-clamp-3",
                  )}
                >
                  {label}
                </span>
                <Badge variant="secondary" className="shrink-0 rounded-full">
                  {item.count}x
                </Badge>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
      )}
    </div>
  );
}
