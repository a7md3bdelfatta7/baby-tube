"use client";

import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  House,
  ListMusic,
  ListVideo,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createVideo,
  deleteVideo,
  getSettings,
  getQueue,
  importPlaylist,
  listVideos,
  updateQueue,
  updateSettings,
  updateVideo,
} from "@/lib/api";
import type { Video } from "@/db/schema";
import { CONTENT_CATEGORIES } from "@/lib/categories";
import { orderVideosForQueue } from "@/lib/queue";
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

type Tab = "list" | "queue" | "settings" | "add" | "playlist";

export function AdminPanel(): ReactElement {
  const [tab, setTab] = useState<Tab>("list");

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as Tab)}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
        <TabsList className="flex h-auto min-h-12 w-full flex-wrap justify-start gap-1.5 rounded-[1.5rem] border border-white/60 bg-white/70 p-2 shadow-[0_10px_30px_-15px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md sm:max-w-none md:flex-1">
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
        <Button
          render={<Link href="/" />}
          variant="outline"
          size="default"
          className="shrink-0 gap-2 rounded-full bg-white/80 sm:self-center"
        >
          <House className="size-4" data-icon="inline-start" />
          Home
        </Button>
      </div>

      <TabsContent value="list" className="mt-0 outline-none">
        <VideoList />
      </TabsContent>
      <TabsContent value="queue" className="mt-0 outline-none">
        <QueueBuilder />
      </TabsContent>
      <TabsContent value="settings" className="mt-0 outline-none">
        <SettingsPanel />
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

function VideoList(): ReactElement {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Video | null>(null);

  const del = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });

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
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Videos</CardTitle>
          <Badge variant="secondary">{data?.length ?? 0} total</Badge>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <ul className="space-y-3">
            {data?.map((v) =>
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
                  <Card className="rounded-xl shadow-none ring-1 ring-black/[0.03] transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center gap-3 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{v.title}</p>
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
          {!data?.length ? (
            <p className="py-6 text-center text-muted-foreground">
              No videos yet — use the other tabs to add some.
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
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="Start (s)"
          value={s.startSeconds}
          onChange={set("startSeconds")}
        />
        <Input
          className="flex-1"
          placeholder="End (s)"
          value={s.endSeconds}
          onChange={set("endSeconds")}
        />
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
