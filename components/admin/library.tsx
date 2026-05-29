"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Pencil, Search, Trash2 } from "lucide-react";
import type { Video } from "@/db/schema";
import { CONTENT_CATEGORIES } from "@/lib/categories";
import {
  deleteVideo,
  listVideos,
  updateVideo,
} from "@/lib/api";
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
import { cn } from "@/lib/utils";
import {
  DropIndicator,
  type DropTarget,
  getDropPosition,
  isLeavingContainer,
  moveVideoRelative,
} from "./drag";
import { AdminCard, CategoryBadges, DragStatus } from "./shared";
import {
  type VideoFormState,
  VideoFormFields,
  toVideoPayload,
} from "./video-form";

type LibraryFilter = "all" | "uncategorized" | "duplicates" | string;

const BASE_LIBRARY_FILTERS: { value: LibraryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "uncategorized", label: "Uncategorized" },
  { value: "duplicates", label: "Duplicates" },
];

function fmtClip(video: Video): string {
  if (video.startSeconds == null && video.endSeconds == null) return "full";
  return `${video.startSeconds ?? 0}s → ${video.endSeconds ?? "end"}`;
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

export function VideoList(): ReactElement {
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
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const videos = data ?? [];
  const draggingVideo = useMemo(
    () => videos.find((video) => video.id === draggingId) ?? null,
    [draggingId, videos],
  );
  const dropTargetVideo = useMemo(
    () => videos.find((video) => video.id === dropTarget?.id) ?? null,
    [dropTarget, videos],
  );
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
    onMutate: async (nextVideos) => {
      await qc.cancelQueries({ queryKey: ["videos"] });
      const previousVideos = qc.getQueryData<Video[]>(["videos"]);

      qc.setQueryData(["videos"], nextVideos);

      return { previousVideos };
    },
    onError: (_error, _nextVideos, context) => {
      if (context?.previousVideos) {
        qc.setQueryData(["videos"], context.previousVideos);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["videos"] }),
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

  const handleDragStart = (
    event: React.DragEvent<HTMLElement>,
    videoId: number,
  ): void => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(videoId));
    setDraggingId(videoId);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLElement>,
    targetId: number,
  ): void => {
    if (draggingId === null || draggingId === targetId || reorder.isPending) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget({ id: targetId, position: getDropPosition(event) });
  };

  const handleDrop = (targetId: number): void => {
    if (draggingId === null || draggingId === targetId || reorder.isPending) {
      setDraggingId(null);
      setDropTarget(null);
      return;
    }

    reorder.mutate(
      moveVideoRelative(videos, draggingId, targetId, dropTarget?.position ?? "before"),
    );
    setDraggingId(null);
    setDropTarget(null);
  };
  const dragStatus =
    draggingVideo && dropTargetVideo
      ? `Drop ${draggingVideo.title} ${dropTarget?.position ?? "before"} ${
          dropTargetVideo.title
        }`
      : draggingVideo
        ? `Dragging ${draggingVideo.title}`
        : "Use the grip handle to reorder videos.";

  if (isLoading) {
    return (
      <AdminCard>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading…
        </CardContent>
      </AdminCard>
    );
  }

  return (
    <>
      <AdminCard>
        <CardHeader className="space-y-4">
          <div className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Videos</CardTitle>
              <CardDescription>
                Search, filter, bulk tag, and drag from the grip handle to reorder.
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
            <LibraryFilterControls
              filter={filter}
              duplicateCount={duplicateIds.size}
              onChange={setFilter}
            />
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
          <DragStatus active={draggingId !== null}>
            {reorder.isPending ? "Saving new library order…" : dragStatus}
          </DragStatus>
          <ul
            className="space-y-3"
            onDragLeave={(event) => {
              if (isLeavingContainer(event)) setDropTarget(null);
            }}
          >
            {filteredVideos.map((video) =>
              editingId === video.id ? (
                <li key={video.id}>
                  <EditRow
                    video={video}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li key={video.id} className="relative">
                  <DropIndicator
                    active={dropTarget?.id === video.id}
                    position={dropTarget?.position ?? "before"}
                    label={
                      dropTarget?.position === "after" ? "Drop after" : "Drop before"
                    }
                  />
                  <Card
                    onDragOver={(event) => handleDragOver(event, video.id)}
                    onDrop={() => handleDrop(video.id)}
                    className={cn(
                      "rounded-xl shadow-none ring-1 ring-black/[0.03] transition-all hover:bg-muted/50",
                      draggingId === video.id &&
                        "scale-[0.99] border-dashed border-primary/40 bg-muted/40 opacity-60",
                      dropTarget?.id === video.id &&
                        "ring-2 ring-[color:var(--tots-ink)]/20",
                    )}
                  >
                    <CardContent className="flex items-center gap-3 py-4">
                      <button
                        type="button"
                        draggable={!reorder.isPending}
                        onDragStart={(event) => handleDragStart(event, video.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDropTarget(null);
                        }}
                        className={cn(
                          "grid size-8 shrink-0 cursor-grab place-items-center rounded-xl text-muted-foreground transition hover:bg-white hover:text-[color:var(--tots-ink)] active:cursor-grabbing",
                          reorder.isPending && "cursor-not-allowed opacity-50",
                        )}
                        aria-label={`Drag ${video.title} to reorder`}
                        disabled={reorder.isPending}
                      >
                        <GripVertical className="size-4" aria-hidden="true" />
                      </button>
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 rounded border-border"
                        checked={selectedIdSet.has(video.id)}
                        onChange={() => toggleSelected(video.id)}
                        aria-label={`Select ${video.title}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{video.title}</p>
                          {duplicateIds.has(video.id) ? (
                            <Badge
                              variant="destructive"
                              className="rounded-full px-2 py-0.5 text-[0.65rem]"
                            >
                              Duplicate
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {video.videoUrl} · clip: {fmtClip(video)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <CategoryBadges categories={video.categories} />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit"
                        onClick={() => setEditingId(video.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete"
                        onClick={() => setPendingDelete(video)}
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
      </AdminCard>

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

function LibraryFilterControls({
  filter,
  duplicateCount,
  onChange,
}: {
  filter: LibraryFilter;
  duplicateCount: number;
  onChange: (nextFilter: LibraryFilter) => void;
}): ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {BASE_LIBRARY_FILTERS.map(({ value, label }) => (
        <Button
          key={value}
          type="button"
          variant={filter === value ? "default" : "secondary"}
          size="sm"
          className="rounded-full"
          onClick={() => onChange(value)}
          disabled={value === "duplicates" && duplicateCount === 0}
        >
          {label}
        </Button>
      ))}
      {CONTENT_CATEGORIES.map((category) => (
        <Button
          key={category}
          type="button"
          variant={filter === category ? "default" : "secondary"}
          size="sm"
          className="rounded-full"
          onClick={() => onChange(category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
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
  const [state, setState] = useState<VideoFormState>({
    title: video.title,
    description: video.description ?? "",
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl ?? "",
    categories: video.categories,
    startSeconds: video.startSeconds?.toString() ?? "",
    endSeconds: video.endSeconds?.toString() ?? "",
  });
  const mutation = useMutation({
    mutationFn: (input: ReturnType<typeof toVideoPayload>) =>
      updateVideo(video.id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      onSaved();
    },
  });

  return (
    <Card className="rounded-2xl border-primary/30 bg-muted/30 shadow-none ring-1 ring-primary/10">
      <CardContent className="space-y-4 pt-6">
        <VideoFormFields state={state} setState={setState} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate(toVideoPayload(state))}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
