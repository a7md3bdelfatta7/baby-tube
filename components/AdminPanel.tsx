"use client";

import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  Baby,
  BarChart3,
  GripVertical,
  ListMusic,
  ListVideo,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  createVideo,
  deleteVideo,
  getProfiles,
  getSettings,
  getQueue,
  importPlaylist,
  listVideos,
  updateQueue,
  updateProfiles,
  updateSettings,
  updateVideo,
} from "@/lib/api";
import type { ChildProfile, Video, WatchHistoryEntry } from "@/db/schema";
import { CONTENT_CATEGORIES } from "@/lib/categories";
import { createProfileId } from "@/lib/profiles";
import { orderVideosForQueue } from "@/lib/queue";
import { extractVideoId } from "@/lib/youtube";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Tab =
  | "dashboard"
  | "list"
  | "queue"
  | "profiles"
  | "settings"
  | "add"
  | "playlist";
type LibraryFilter = "all" | "uncategorized" | "duplicates" | string;

export function AdminPanel(): ReactElement {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as Tab)}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
        <TabsList className="flex h-auto min-h-12 w-full flex-wrap justify-start gap-1.5 rounded-[1.5rem] border border-white/60 bg-white/70 p-2 shadow-[0_10px_30px_-15px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md sm:max-w-none md:flex-1">
          <TabsTrigger
            value="dashboard"
            className="gap-1.5 rounded-2xl px-4 font-medium data-[active]:bg-white data-[active]:text-[color:var(--tots-ink)] data-[active]:shadow-md data-[active]:ring-1 data-[active]:ring-black/[0.04]"
          >
            <BarChart3 className="size-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="gap-1.5 rounded-2xl px-4 font-medium data-[active]:bg-white data-[active]:text-[color:var(--tots-ink)] data-[active]:shadow-md data-[active]:ring-1 data-[active]:ring-black/[0.04]"
          >
            <ListVideo className="size-4" />
            Library
          </TabsTrigger>
          <TabsTrigger
            value="queue"
            className="gap-1.5 rounded-2xl px-4 font-medium data-[active]:bg-white data-[active]:text-[color:var(--tots-ink)] data-[active]:shadow-md data-[active]:ring-1 data-[active]:ring-black/[0.04]"
          >
            <ListVideo className="size-4" />
            Queue
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="gap-1.5 rounded-2xl px-4 font-medium data-[active]:bg-white data-[active]:text-[color:var(--tots-ink)] data-[active]:shadow-md data-[active]:ring-1 data-[active]:ring-black/[0.04]"
          >
            <AlarmClock className="size-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger
            value="profiles"
            className="gap-1.5 rounded-2xl px-4 font-medium data-[active]:bg-white data-[active]:text-[color:var(--tots-ink)] data-[active]:shadow-md data-[active]:ring-1 data-[active]:ring-black/[0.04]"
          >
            <Baby className="size-4" />
            Profiles
          </TabsTrigger>
          <TabsTrigger
            value="add"
            className="gap-1.5 rounded-2xl px-4 font-medium data-[active]:bg-white data-[active]:text-[color:var(--tots-ink)] data-[active]:shadow-md data-[active]:ring-1 data-[active]:ring-black/[0.04]"
          >
            <Plus className="size-4" />
            Add videos
          </TabsTrigger>
          <TabsTrigger
            value="playlist"
            className="gap-1.5 rounded-2xl px-4 font-medium data-[active]:bg-white data-[active]:text-[color:var(--tots-ink)] data-[active]:shadow-md data-[active]:ring-1 data-[active]:ring-black/[0.04]"
          >
            <ListMusic className="size-4" />
            Playlist
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="dashboard" className="mt-0 outline-none">
        <ParentDashboard />
      </TabsContent>
      <TabsContent value="list" className="mt-0 outline-none">
        <VideoList />
      </TabsContent>
      <TabsContent value="queue" className="mt-0 outline-none">
        <QueueBuilder />
      </TabsContent>
      <TabsContent value="settings" className="mt-0 outline-none">
        <SettingsPanel />
      </TabsContent>
      <TabsContent value="profiles" className="mt-0 outline-none">
        <ProfilesPanel />
      </TabsContent>
      <TabsContent value="add" className="mt-0 outline-none">
        <AddVideos />
      </TabsContent>
      <TabsContent value="playlist" className="mt-0 outline-none">
        <PlaylistImport />
      </TabsContent>
    </Tabs>
  );
}

function fmtClip(v: Video): string {
  if (v.startSeconds == null && v.endSeconds == null) return "full";
  return `${v.startSeconds ?? 0}s → ${v.endSeconds ?? "end"}`;
}

function fmtCategories(categories: readonly string[]): string {
  return categories.length ? categories.join(", ") : "Uncategorized";
}

function duplicateKey(video: Video): string {
  return extractVideoId(video.videoUrl) ?? video.videoUrl.trim().toLowerCase();
}

function findDuplicateIds(videos: readonly Video[]): Set<number> {
  const groups = new Map<string, number[]>();

  videos.forEach((video) => {
    const key = duplicateKey(video);
    if (!key) return;
    groups.set(key, [...(groups.get(key) ?? []), video.id]);
  });

  return new Set(
    Array.from(groups.values())
      .filter((ids) => ids.length > 1)
      .flat(),
  );
}

function matchesLibraryFilter(
  video: Video,
  filter: LibraryFilter,
  duplicateIds: ReadonlySet<number>,
): boolean {
  if (filter === "all") return true;
  if (filter === "uncategorized") return video.categories.length === 0;
  if (filter === "duplicates") return duplicateIds.has(video.id);
  return video.categories.includes(filter);
}

function matchesSearch(video: Video, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [
    video.title,
    video.description,
    video.videoUrl,
    ...video.categories,
  ].some((value) => value.toLowerCase().includes(needle));
}

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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
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

function ParentDashboard(): ReactElement {
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
      <Card className="rounded-[1.75rem] border-white/60 bg-white/85 shadow-[0_18px_45px_-20px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md">
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading dashboard…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-[1.75rem] border-white/60 bg-white/85 shadow-[0_18px_45px_-20px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md">
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
      </Card>

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
      ? Math.min(100, Math.round((insight.screenTimeSecondsToday / dailyLimitSeconds) * 100))
      : 0;

  return (
    <Card className="rounded-[1.75rem] border-white/60 bg-white/85 shadow-[0_18px_45px_-20px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{insight.profile.name}</CardTitle>
            <CardDescription>
              {insight.profile.ageRange || "No age range"} ·{" "}
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
    </Card>
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

function moveVideoBefore(
  videos: readonly Video[],
  movedId: number,
  targetId: number,
): Video[] {
  if (movedId === targetId) return [...videos];

  const moved = videos.find((video) => video.id === movedId);
  if (!moved) return [...videos];

  const withoutMoved = videos.filter((video) => video.id !== movedId);
  const targetIndex = withoutMoved.findIndex((video) => video.id === targetId);
  if (targetIndex < 0) return [...videos];

  return [
    ...withoutMoved.slice(0, targetIndex),
    moved,
    ...withoutMoved.slice(targetIndex),
  ];
}

function nextClipValue(value: string, delta: number): string {
  const current = value === "" ? 0 : Number(value);
  if (!Number.isFinite(current)) return String(Math.max(0, delta));
  return String(Math.max(0, Math.round(current + delta)));
}

function VideoList(): ReactElement {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Video | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkCategory, setBulkCategory] = useState<string>(CONTENT_CATEGORIES[0]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const videos = data ?? [];
  const duplicateIds = useMemo(() => findDuplicateIds(videos), [videos]);
  const filteredVideos = useMemo(
    () =>
      videos.filter(
        (video) =>
          matchesLibraryFilter(video, filter, duplicateIds) &&
          matchesSearch(video, searchQuery),
      ),
    [duplicateIds, filter, searchQuery, videos],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedVideos = useMemo(
    () => videos.filter((video) => selectedIdSet.has(video.id)),
    [selectedIdSet, videos],
  );
  const allFilteredSelected =
    filteredVideos.length > 0 &&
    filteredVideos.every((video) => selectedIdSet.has(video.id));

  const del = useMutation({
    mutationFn: deleteVideo,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      setSelectedIds((ids) => ids.filter((item) => item !== id));
    },
  });
  const bulkAssign = useMutation({
    mutationFn: async () => {
      await Promise.all(
        selectedVideos.map((video) =>
          updateVideo(video.id, {
            categories: Array.from(new Set([...video.categories, bulkCategory])),
          }),
        ),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      setSelectedIds([]);
    },
  });
  const reorder = useMutation({
    mutationFn: async (nextVideos: Video[]) => {
      await Promise.all(
        nextVideos.map((video, index) =>
          updateVideo(video.id, { position: index + 1 }),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });

  const toggleSelected = (id: number): void => {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  };

  const toggleFilteredSelection = (): void => {
    setSelectedIds((ids) => {
      const filteredIds = filteredVideos.map((video) => video.id);
      if (allFilteredSelected) {
        return ids.filter((id) => !filteredIds.includes(id));
      }

      return Array.from(new Set([...ids, ...filteredIds]));
    });
  };

  const handleDrop = (targetId: number): void => {
    if (draggingId === null || draggingId === targetId || reorder.isPending) {
      setDraggingId(null);
      return;
    }

    reorder.mutate(moveVideoBefore(videos, draggingId, targetId));
    setDraggingId(null);
  };

  if (isLoading) {
    return (
      <Card className="rounded-[1.75rem] border-white/60 bg-white/85 shadow-[0_18px_45px_-20px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md">
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading…
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-[1.75rem] border-white/60 bg-white/85 shadow-[0_18px_45px_-20px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md">
        <CardHeader className="space-y-4">
          <div className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Videos</CardTitle>
              <CardDescription>
                Search, filter, bulk tag, and drag rows to curate the library.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {duplicateIds.size > 0 ? (
                <Badge variant="destructive">{duplicateIds.size} duplicate</Badge>
              ) : null}
              <Badge variant="secondary">{videos.length} total</Badge>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search titles, URLs, descriptions, or categories"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={filter === "all" ? "default" : "secondary"}
                size="sm"
                className="rounded-full"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                type="button"
                variant={filter === "uncategorized" ? "default" : "secondary"}
                size="sm"
                className="rounded-full"
                onClick={() => setFilter("uncategorized")}
              >
                Uncategorized
              </Button>
              <Button
                type="button"
                variant={filter === "duplicates" ? "default" : "secondary"}
                size="sm"
                className="rounded-full"
                onClick={() => setFilter("duplicates")}
                disabled={duplicateIds.size === 0}
              >
                Duplicates
              </Button>
              {CONTENT_CATEGORIES.map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={filter === category ? "default" : "secondary"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setFilter(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 p-3 ring-1 ring-black/[0.04]">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={toggleFilteredSelection}
                disabled={filteredVideos.length === 0}
              >
                {allFilteredSelected ? "Clear visible" : "Select visible"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedVideos.length} selected · {filteredVideos.length} shown
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-8 rounded-lg border border-input bg-white/80 px-2 text-sm"
                value={bulkCategory}
                onChange={(event) => setBulkCategory(event.target.value)}
                aria-label="Bulk category"
              >
                {CONTENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={() => bulkAssign.mutate()}
                disabled={selectedVideos.length === 0 || bulkAssign.isPending}
              >
                {bulkAssign.isPending ? "Applying…" : "Apply category"}
              </Button>
            </div>
          </div>
          <ul className="space-y-3">
            {filteredVideos.map((v) =>
              editingId === v.id ? (
                <li key={v.id}>
                  <EditRow
                    video={v}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li key={v.id}>
                  <Card
                    draggable={!reorder.isPending}
                    onDragStart={() => setDraggingId(v.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(v.id)}
                    className={cn(
                      "rounded-xl shadow-none ring-1 ring-black/[0.03] transition-colors hover:bg-muted/50",
                      draggingId === v.id && "opacity-60",
                    )}
                  >
                    <CardContent className="flex items-center gap-3 py-4">
                      <GripVertical
                        className="size-4 shrink-0 cursor-grab text-muted-foreground"
                        aria-hidden="true"
                      />
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 rounded border-border"
                        checked={selectedIdSet.has(v.id)}
                        onChange={() => toggleSelected(v.id)}
                        aria-label={`Select ${v.title}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{v.title}</p>
                          {duplicateIds.has(v.id) ? (
                            <Badge
                              variant="destructive"
                              className="rounded-full px-2 py-0.5 text-[0.65rem]"
                            >
                              Duplicate
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {v.videoUrl} · clip: {fmtClip(v)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {v.categories.length > 0 ? (
                            v.categories.map((category) => (
                              <Badge
                                key={category}
                                variant="secondary"
                                className="rounded-full bg-white/80 px-2 py-0.5 text-[0.65rem]"
                              >
                                {category}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Uncategorized
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit"
                        onClick={() => setEditingId(v.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete"
                        onClick={() => setPendingDelete(v)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ),
            )}
          </ul>
          {videos.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              No videos yet — use the other tabs to add some.
            </p>
          ) : null}
          {videos.length > 0 && filteredVideos.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              No videos match the current search or filter.
            </p>
          ) : null}
          {reorder.isSuccess ? (
            <p className="text-sm text-emerald-600">Library order saved.</p>
          ) : null}
          {reorder.isError || bulkAssign.isError ? (
            <p className="text-sm text-destructive">
              {((reorder.error ?? bulkAssign.error) as Error)?.message ??
                "Update failed"}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this video?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.title}" will be removed from Baby Tube.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) del.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function QueueBuilder(): ReactElement {
  const qc = useQueryClient();
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });
  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ["queue"],
    queryFn: getQueue,
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!queue) return;
    setSelectedIds(queue.queueVideoIds);
  }, [queue]);

  const selectedVideos = useMemo(
    () => orderVideosForQueue(videos ?? [], selectedIds),
    [selectedIds, videos],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const availableVideos = useMemo(
    () => (videos ?? []).filter((video) => !selectedIdSet.has(video.id)),
    [selectedIdSet, videos],
  );

  const save = useMutation({
    mutationFn: () => updateQueue({ queueVideoIds: selectedIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });

  const addVideo = (id: number): void => {
    setSelectedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  };

  const removeVideo = (id: number): void => {
    setSelectedIds((ids) => ids.filter((item) => item !== id));
  };

  const moveVideo = (id: number, direction: -1 | 1): void => {
    setSelectedIds((ids) => {
      const index = ids.indexOf(id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return ids;

      const next = [...ids];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const isLoading = videosLoading || queueLoading;

  return (
    <Card className="rounded-[1.75rem] border-white/60 bg-white/85 shadow-[0_18px_45px_-20px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md">
      <CardHeader>
        <CardTitle>Today&apos;s queue</CardTitle>
        <CardDescription>
          Pick the videos children can see today. When the queue has videos, the
          home page and next button follow this order.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground lg:col-span-2">
            Loading queue…
          </div>
        ) : (
          <>
            <section aria-labelledby="queue-selected-heading" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 id="queue-selected-heading" className="font-semibold">
                    Selected order
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedVideos.length} video
                    {selectedVideos.length === 1 ? "" : "s"} in queue
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setSelectedIds([])}
                  disabled={selectedIds.length === 0}
                >
                  Clear
                </Button>
              </div>

              <div className="space-y-2">
                {selectedVideos.map((video, index) => (
                  <Card
                    key={video.id}
                    className="rounded-2xl bg-white/70 shadow-none ring-1 ring-black/[0.04]"
                  >
                    <CardContent className="flex items-center gap-3 py-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color:var(--tots-ink)] text-xs font-bold text-[color:var(--tots-cream)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {video.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {fmtCategories(video.categories)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => moveVideo(video.id, -1)}
                          disabled={index === 0}
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => moveVideo(video.id, 1)}
                          disabled={index === selectedVideos.length - 1}
                        >
                          Down
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => removeVideo(video.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {selectedVideos.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-muted-foreground/25 bg-white/60 p-5 text-center text-sm text-muted-foreground">
                    No queue yet. Add videos from the library list.
                  </p>
                ) : null}
              </div>
            </section>

            <section aria-labelledby="queue-library-heading" className="space-y-3">
              <div>
                <h3 id="queue-library-heading" className="font-semibold">
                  Library videos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Add approved videos to today&apos;s queue.
                </p>
              </div>

              <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {availableVideos.map((video) => (
                  <Card
                    key={video.id}
                    className="rounded-2xl bg-white/70 shadow-none ring-1 ring-black/[0.04]"
                  >
                    <CardContent className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {video.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {fmtCategories(video.categories)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => addVideo(video.id)}
                      >
                        Add
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {availableVideos.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-muted-foreground/25 bg-white/60 p-5 text-center text-sm text-muted-foreground">
                    Every library video is already in the queue.
                  </p>
                ) : null}
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 lg:col-span-2">
              <p className="text-sm text-muted-foreground">
                Leave the queue empty to show the full library.
              </p>
              <Button
                type="button"
                className="rounded-full"
                onClick={() => save.mutate()}
                disabled={save.isPending}
              >
                {save.isPending ? "Saving…" : "Save queue"}
              </Button>
            </div>

            {save.isSuccess ? (
              <p className="text-sm text-emerald-600 lg:col-span-2">
                Queue saved.
              </p>
            ) : null}
            {save.isError ? (
              <p className="text-sm text-destructive lg:col-span-2">
                {(save.error as Error)?.message ?? "Save failed"}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsPanel(): ReactElement {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const [screenTimeMinutes, setScreenTimeMinutes] = useState("15");
  const parsedMinutes = Number(screenTimeMinutes);
  const isValid =
    Number.isInteger(parsedMinutes) && parsedMinutes >= 1 && parsedMinutes <= 180;

  useEffect(() => {
    if (!data) return;
    setScreenTimeMinutes(String(data.screenTimeMinutes));
  }, [data]);

  const m = useMutation({
    mutationFn: () => updateSettings({ screenTimeMinutes: parsedMinutes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  return (
    <Card className="rounded-[1.75rem] border-white/60 bg-white/85 shadow-[0_18px_45px_-20px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md">
      <CardHeader>
        <CardTitle>Screen time</CardTitle>
        <CardDescription>
          Set how many minutes a watch session can run before the break screen
          appears.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:max-w-xs">
          <Input
            type="number"
            min={1}
            max={180}
            step={1}
            placeholder="15"
            value={screenTimeMinutes}
            onChange={(e) => setScreenTimeMinutes(e.target.value)}
            disabled={isLoading}
            aria-invalid={!isValid ? true : undefined}
          />
          <p className="text-xs text-muted-foreground">
            Use a whole number between 1 and 180 minutes.
          </p>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => m.mutate()}
            disabled={!isValid || isLoading || m.isPending}
          >
            {m.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
        {!isValid ? (
          <p className="text-sm text-destructive">
            Enter a valid screen-time limit before saving.
          </p>
        ) : null}
        {m.isSuccess ? (
          <p className="text-sm text-emerald-600">Settings saved.</p>
        ) : null}
        {m.isError ? (
          <p className="text-sm text-destructive">
            {(m.error as Error)?.message ?? "Save failed"}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

type ProfileForm = {
  id: string;
  name: string;
  ageRange: string;
  screenTimeMinutes: string;
  screenTimeResetHours: string;
  preferredCategories: string[];
  watchHistory: ChildProfile["watchHistory"];
};

function toProfileForm(profile: ChildProfile): ProfileForm {
  return {
    id: profile.id,
    name: profile.name,
    ageRange: profile.ageRange,
    screenTimeMinutes: String(profile.screenTimeMinutes),
    screenTimeResetHours: String(profile.screenTimeResetHours ?? 24),
    preferredCategories: profile.preferredCategories,
    watchHistory: profile.watchHistory,
  };
}

function toChildProfile(profile: ProfileForm): ChildProfile {
  return {
    id: profile.id,
    name: profile.name.trim(),
    ageRange: profile.ageRange.trim(),
    screenTimeMinutes: Number(profile.screenTimeMinutes),
    screenTimeResetHours: Number(profile.screenTimeResetHours),
    preferredCategories: profile.preferredCategories,
    watchHistory: profile.watchHistory,
  };
}

function isValidProfile(profile: ProfileForm): boolean {
  const minutes = Number(profile.screenTimeMinutes);
  const resetHours = Number(profile.screenTimeResetHours);

  return (
    profile.name.trim().length > 0 &&
    Number.isInteger(minutes) &&
    minutes >= 1 &&
    minutes <= 180 &&
    Number.isInteger(resetHours) &&
    resetHours >= 1 &&
    resetHours <= 168
  );
}

function ProfilesPanel(): ReactElement {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
  });
  const [profiles, setProfiles] = useState<ProfileForm[]>([]);
  const canSave = profiles.every(isValidProfile);

  useEffect(() => {
    if (!data) return;
    setProfiles(data.childProfiles.map(toProfileForm));
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      updateProfiles({ childProfiles: profiles.map(toChildProfile) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });

  const updateProfile = (id: string, patch: Partial<ProfileForm>): void => {
    setProfiles((items) =>
      items.map((profile) =>
        profile.id === id ? { ...profile, ...patch } : profile,
      ),
    );
  };

  const addProfile = (): void => {
    setProfiles((items) => [
      ...items,
      {
        id: createProfileId(),
        name: "",
        ageRange: "",
        screenTimeMinutes: "15",
        screenTimeResetHours: "24",
        preferredCategories: [],
        watchHistory: [],
      },
    ]);
  };

  const removeProfile = (id: string): void => {
    setProfiles((items) => items.filter((profile) => profile.id !== id));
  };

  return (
    <Card className="rounded-[1.75rem] border-white/60 bg-white/85 shadow-[0_18px_45px_-20px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md">
      <CardHeader>
        <CardTitle>Child profiles</CardTitle>
        <CardDescription>
          Give each child their own timer, favorite categories, age range, and
          recent watch history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">
            Loading profiles…
          </p>
        ) : (
          <>
            <div className="space-y-4">
              {profiles.map((profile) => {
                const minutes = Number(profile.screenTimeMinutes);
                const resetHours = Number(profile.screenTimeResetHours);
                const isValidMinutes =
                  Number.isInteger(minutes) && minutes >= 1 && minutes <= 180;
                const isValidResetHours =
                  Number.isInteger(resetHours) &&
                  resetHours >= 1 &&
                  resetHours <= 168;

                return (
                  <Card
                    key={profile.id}
                    className="rounded-2xl bg-white/70 shadow-none ring-1 ring-black/[0.04]"
                  >
                    <CardContent className="space-y-4 pt-6">
                      <div className="grid gap-3 md:grid-cols-4">
                        <Input
                          placeholder="Child name"
                          value={profile.name}
                          onChange={(e) =>
                            updateProfile(profile.id, { name: e.target.value })
                          }
                          aria-invalid={!profile.name.trim() ? true : undefined}
                        />
                        <Input
                          placeholder="Age range, e.g. 3-5"
                          value={profile.ageRange}
                          onChange={(e) =>
                            updateProfile(profile.id, {
                              ageRange: e.target.value,
                            })
                          }
                        />
                        <Input
                          type="number"
                          min={1}
                          max={180}
                          step={1}
                          placeholder="Minutes"
                          value={profile.screenTimeMinutes}
                          onChange={(e) =>
                            updateProfile(profile.id, {
                              screenTimeMinutes: e.target.value,
                            })
                          }
                          aria-invalid={!isValidMinutes ? true : undefined}
                        />
                        <Input
                          type="number"
                          min={1}
                          max={168}
                          step={1}
                          placeholder="Reset every hours"
                          value={profile.screenTimeResetHours}
                          onChange={(e) =>
                            updateProfile(profile.id, {
                              screenTimeResetHours: e.target.value,
                            })
                          }
                          aria-invalid={!isValidResetHours ? true : undefined}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Timer reset interval is in hours. Use 24 for a daily reset.
                      </p>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Preferred categories
                        </p>
                        <CategoryPicker
                          value={profile.preferredCategories}
                          onChange={(preferredCategories) =>
                            updateProfile(profile.id, { preferredCategories })
                          }
                        />
                      </div>

                      <div className="rounded-2xl bg-muted/40 p-4">
                        <p className="text-sm font-medium">Recent watch history</p>
                        {profile.watchHistory.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {profile.watchHistory.slice(0, 5).map((entry) => (
                              <li key={`${entry.videoId}-${entry.watchedAt}`}>
                                {entry.title} ·{" "}
                                {entry.status} · {formatDuration(entry.watchedSeconds)} ·{" "}
                                {new Date(entry.watchedAt).toLocaleDateString()}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">
                            No watched videos yet.
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => removeProfile(profile.id)}
                        >
                          <Trash2 className="size-3.5" data-icon="inline-start" />
                          Remove profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {profiles.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-muted-foreground/25 bg-white/60 p-5 text-center text-sm text-muted-foreground">
                  No profiles yet. Add one to personalize the child experience.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={addProfile}
                className="rounded-full"
              >
                <Plus className="size-4" data-icon="inline-start" />
                Add profile
              </Button>
              <Button
                type="button"
                onClick={() => save.mutate()}
                disabled={!canSave || save.isPending}
                className="rounded-full"
              >
                {save.isPending ? "Saving…" : "Save profiles"}
              </Button>
            </div>

            {!canSave ? (
              <p className="text-sm text-destructive">
                Each profile needs a name, a whole-number timer from 1 to 180
                minutes, and a reset interval from 1 to 168 hours.
              </p>
            ) : null}
            {save.isSuccess ? (
              <p className="text-sm text-emerald-600">Profiles saved.</p>
            ) : null}
            {save.isError ? (
              <p className="text-sm text-destructive">
                {(save.error as Error)?.message ?? "Save failed"}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

type FormState = {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  categories: string[];
  startSeconds: string;
  endSeconds: string;
};

const blank: FormState = {
  title: "",
  description: "",
  videoUrl: "",
  thumbnailUrl: "",
  categories: [],
  startSeconds: "",
  endSeconds: "",
};

function toPayload(s: FormState): {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  categories: string[];
  startSeconds: number | null;
  endSeconds: number | null;
} {
  return {
    title: s.title.trim(),
    description: s.description,
    videoUrl: s.videoUrl.trim(),
    thumbnailUrl: s.thumbnailUrl.trim() || null,
    categories: s.categories,
    startSeconds: s.startSeconds === "" ? null : Number(s.startSeconds),
    endSeconds: s.endSeconds === "" ? null : Number(s.endSeconds),
  };
}

function EditRow({
  video,
  onCancel,
  onSaved,
}: {
  video: Video;
  onCancel: () => void;
  onSaved: () => void;
}): ReactElement {
  const qc = useQueryClient();
  const [s, setS] = useState<FormState>({
    title: video.title,
    description: video.description ?? "",
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl ?? "",
    categories: video.categories,
    startSeconds: video.startSeconds?.toString() ?? "",
    endSeconds: video.endSeconds?.toString() ?? "",
  });
  const m = useMutation({
    mutationFn: (input: ReturnType<typeof toPayload>) =>
      updateVideo(video.id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      onSaved();
    },
  });

  return (
    <Card className="rounded-2xl border-primary/30 bg-muted/30 shadow-none ring-1 ring-primary/10">
      <CardContent className="space-y-4 pt-6">
        <FormFields s={s} setS={setS} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => m.mutate(toPayload(s))}
            disabled={m.isPending}
          >
            {m.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FormFields({
  s,
  setS,
}: {
  s: FormState;
  setS: (next: FormState) => void;
}): ReactElement {
  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setS({ ...s, [k]: e.target.value });
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Input placeholder="Title" value={s.title} onChange={set("title")} />
      <Input
        placeholder="YouTube URL"
        value={s.videoUrl}
        onChange={set("videoUrl")}
      />
      <Input
        placeholder="Thumbnail URL (optional)"
        value={s.thumbnailUrl}
        onChange={set("thumbnailUrl")}
      />
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            className="flex-1"
            type="number"
            min={0}
            step={1}
            placeholder="Start (s)"
            value={s.startSeconds}
            onChange={set("startSeconds")}
          />
          <Input
            className="flex-1"
            type="number"
            min={0}
            step={1}
            placeholder="End (s)"
            value={s.endSeconds}
            onChange={set("endSeconds")}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() =>
              setS({ ...s, startSeconds: nextClipValue(s.startSeconds, -5) })
            }
          >
            Start -5s
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() =>
              setS({ ...s, startSeconds: nextClipValue(s.startSeconds, 5) })
            }
          >
            Start +5s
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() =>
              setS({ ...s, endSeconds: nextClipValue(s.endSeconds, -5) })
            }
          >
            End -5s
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() =>
              setS({ ...s, endSeconds: nextClipValue(s.endSeconds, 5) })
            }
          >
            End +5s
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setS({ ...s, startSeconds: "", endSeconds: "" })}
          >
            Clear clip
          </Button>
        </div>
      </div>
      <Textarea
        className="md:col-span-2 min-h-[5rem]"
        placeholder="Description (optional)"
        value={s.description}
        onChange={set("description")}
      />
      <div className="space-y-2 md:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Categories</p>
          <p className="text-xs text-muted-foreground">
            {fmtCategories(s.categories)}
          </p>
        </div>
        <CategoryPicker
          value={s.categories}
          onChange={(categories) => setS({ ...s, categories })}
        />
      </div>
    </div>
  );
}

function CategoryPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}): ReactElement {
  const toggle = (category: string): void => {
    onChange(
      value.includes(category)
        ? value.filter((item) => item !== category)
        : [...value, category],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {CONTENT_CATEGORIES.map((category) => {
        const selected = value.includes(category);

        return (
          <Button
            key={category}
            type="button"
            variant={selected ? "default" : "secondary"}
            size="sm"
            className={cn(
              "rounded-full",
              !selected && "bg-white/80 hover:bg-white",
            )}
            aria-pressed={selected}
            onClick={() => toggle(category)}
          >
            {category}
          </Button>
        );
      })}
    </div>
  );
}

type Row = FormState & {
  status: "idle" | "uploading" | "saved" | "error";
  error?: string;
};

function AddVideos(): ReactElement {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([{ ...blank, status: "idle" }]);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (i: number, patch: Partial<Row>): void =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addRow = (): void =>
    setRows((rs) => [...rs, { ...blank, status: "idle" }]);
  const removeRow = (i: number): void =>
    setRows((rs) =>
      rs.length === 1 ? [{ ...blank, status: "idle" }] : rs.filter((_, idx) => idx !== i),
    );

  const validRowCount = rows.filter(
    (r) => r.status !== "saved" && r.title.trim() && r.videoUrl.trim(),
  ).length;
  const canSubmit = !submitting && validRowCount > 0;

  const submitAll = async (): Promise<void> => {
    setSubmitting(true);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.status === "saved") continue;
      if (!r.title.trim() || !r.videoUrl.trim()) continue;
      updateRow(i, { status: "uploading", error: undefined });
      try {
        await createVideo(toPayload(r));
        updateRow(i, { status: "saved" });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed";
        updateRow(i, { status: "error", error: msg });
      }
    }
    qc.invalidateQueries({ queryKey: ["videos"] });
    setSubmitting(false);
    setTimeout(() => {
      setRows((rs) => {
        const remaining = rs.filter((r) => r.status !== "saved");
        return remaining.length ? remaining : [{ ...blank, status: "idle" }];
      });
    }, 600);
  };

  const saveLabel =
    submitting
      ? "Saving…"
      : validRowCount > 1
        ? `Save ${validRowCount} videos`
        : "Save video";

  return (
    <Card className="rounded-[1.75rem] border-white/60 bg-white/85 shadow-[0_18px_45px_-20px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md">
      <CardHeader>
        <CardTitle>Add videos</CardTitle>
        <CardDescription>
          Paste a title and YouTube link. Optional clip times trim the segment.
          Use <span className="font-medium text-foreground">Add another</span> to
          queue more at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {rows.map((r, i) => (
            <Card
              key={i}
              className={cn(
                "rounded-2xl shadow-none ring-1 ring-black/[0.04]",
                r.status === "saved" &&
                  "border-emerald-500/40 bg-emerald-50/60",
                r.status === "error" &&
                  "border-destructive/50 bg-destructive/5",
                r.status === "uploading" &&
                  "border-amber-500/40 bg-amber-50/60",
              )}
            >
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Video {i + 1}
                  </span>
                  <span className="text-sm">
                    {r.status === "saved" && (
                      <span className="text-emerald-600">Saved</span>
                    )}
                    {r.status === "uploading" && (
                      <span className="text-amber-600">Uploading…</span>
                    )}
                    {r.status === "error" && (
                      <span className="text-destructive">{r.error}</span>
                    )}
                  </span>
                </div>
                <FormFields s={r} setS={(next) => updateRow(i, next)} />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1 && !r.title && !r.videoUrl}
                  >
                    <Trash2 className="size-3.5" data-icon="inline-start" />
                    {rows.length === 1 ? "Clear" : "Remove"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={addRow}
            className="rounded-full"
          >
            <Plus className="size-4" data-icon="inline-start" />
            Add another
          </Button>
          <Button
            type="button"
            onClick={() => void submitAll()}
            disabled={!canSubmit}
            className="rounded-full"
          >
            {saveLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlaylistImport(): ReactElement {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const m = useMutation({
    mutationFn: () => importPlaylist(url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
  return (
    <Card className="rounded-[1.75rem] border-white/60 bg-white/85 shadow-[0_18px_45px_-20px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md">
      <CardHeader>
        <CardTitle>Import a playlist</CardTitle>
        <CardDescription>
          Paste a YouTube playlist URL to bulk-import videos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="https://www.youtube.com/playlist?list=PL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => m.mutate()}
            disabled={!url || m.isPending}
          >
            {m.isPending ? "Importing…" : "Import"}
          </Button>
        </div>
        {m.isSuccess ? (
          <p className="text-sm text-emerald-600">
            Imported {m.data.imported} videos
            {m.data.skipped > 0 ? ` (skipped ${m.data.skipped})` : ""}.
          </p>
        ) : null}
        {m.isError ? (
          <p className="text-sm text-destructive">
            {(m.error as Error)?.message ?? "Import failed"}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
