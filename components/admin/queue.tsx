"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import { getQueue, listVideos, updateQueue } from "@/lib/api";
import { orderVideosForQueue } from "@/lib/queue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DropIndicator,
  type DropTarget,
  getDropPosition,
  isLeavingContainer,
  moveIdRelative,
} from "./drag";
import { AdminCard, DragStatus, fmtCategories } from "./shared";

export function QueueBuilder(): ReactElement {
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
  const [draggingQueueId, setDraggingQueueId] = useState<number | null>(null);
  const [queueDropTarget, setQueueDropTarget] = useState<DropTarget | null>(null);

  useEffect(() => {
    if (!queue) return;
    setSelectedIds(queue.queueVideoIds);
  }, [queue]);

  const selectedVideos = useMemo(
    () => orderVideosForQueue(videos ?? [], selectedIds),
    [selectedIds, videos],
  );
  const draggingQueueVideo = useMemo(
    () => selectedVideos.find((video) => video.id === draggingQueueId) ?? null,
    [draggingQueueId, selectedVideos],
  );
  const queueDropTargetVideo = useMemo(
    () =>
      selectedVideos.find((video) => video.id === queueDropTarget?.id) ?? null,
    [queueDropTarget, selectedVideos],
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

  const handleQueueDragStart = (
    event: React.DragEvent<HTMLElement>,
    videoId: number,
  ): void => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(videoId));
    setDraggingQueueId(videoId);
  };

  const handleQueueDragOver = (
    event: React.DragEvent<HTMLElement>,
    targetId: number,
  ): void => {
    if (draggingQueueId === null || draggingQueueId === targetId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setQueueDropTarget({ id: targetId, position: getDropPosition(event) });
  };

  const handleQueueDrop = (targetId: number): void => {
    if (draggingQueueId === null || draggingQueueId === targetId) {
      setDraggingQueueId(null);
      setQueueDropTarget(null);
      return;
    }

    setSelectedIds((ids) =>
      moveIdRelative(
        ids,
        draggingQueueId,
        targetId,
        queueDropTarget?.position ?? "before",
      ),
    );
    setDraggingQueueId(null);
    setQueueDropTarget(null);
  };
  const queueDragStatus =
    draggingQueueVideo && queueDropTargetVideo
      ? `Drop ${draggingQueueVideo.title} ${
          queueDropTarget?.position ?? "before"
        } ${queueDropTargetVideo.title}`
      : draggingQueueVideo
        ? `Dragging ${draggingQueueVideo.title}`
        : "Use the grip handle to reorder the queue before saving.";

  const isLoading = videosLoading || queueLoading;

  return (
    <AdminCard>
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

              <DragStatus active={draggingQueueId !== null}>
                {queueDragStatus}
              </DragStatus>

              <div
                className="space-y-2"
                onDragLeave={(event) => {
                  if (isLeavingContainer(event)) setQueueDropTarget(null);
                }}
              >
                {selectedVideos.map((video, index) => (
                  <div key={video.id} className="relative">
                    <DropIndicator
                      active={queueDropTarget?.id === video.id}
                      position={queueDropTarget?.position ?? "before"}
                      label={
                        queueDropTarget?.position === "after"
                          ? "Drop after"
                          : "Drop before"
                      }
                    />
                    <Card
                      onDragOver={(event) => handleQueueDragOver(event, video.id)}
                      onDrop={() => handleQueueDrop(video.id)}
                      className={cn(
                        "rounded-2xl bg-white/70 shadow-none ring-1 ring-black/[0.04] transition-all",
                        draggingQueueId === video.id &&
                          "scale-[0.99] border-dashed border-primary/40 bg-muted/40 opacity-60",
                        queueDropTarget?.id === video.id &&
                          "ring-2 ring-[color:var(--tots-ink)]/20",
                      )}
                    >
                      <CardContent className="flex items-center gap-3 py-3">
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) =>
                              handleQueueDragStart(event, video.id)
                            }
                            onDragEnd={() => {
                              setDraggingQueueId(null);
                              setQueueDropTarget(null);
                            }}
                            className="grid size-8 cursor-grab place-items-center rounded-xl text-muted-foreground transition hover:bg-white hover:text-[color:var(--tots-ink)] active:cursor-grabbing"
                            aria-label={`Drag ${video.title} to reorder queue`}
                          >
                            <GripVertical className="size-4" aria-hidden="true" />
                          </button>
                          <span className="grid size-8 place-items-center rounded-full bg-[color:var(--tots-ink)] text-xs font-bold text-[color:var(--tots-cream)]">
                            {index + 1}
                          </span>
                        </div>
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
                  </div>
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
    </AdminCard>
  );
}
