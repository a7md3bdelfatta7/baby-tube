"use client";

import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlarmClock,
  House,
  ListMusic,
  ListVideo,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createVideo,
  deleteVideo,
  getSettings,
  importPlaylist,
  listVideos,
  updateSettings,
  updateVideo,
} from "@/lib/api";
import type { Video } from "@/db/schema";
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

type Tab = "list" | "settings" | "single" | "multi" | "playlist";

export function AdminPanel(): ReactElement {
  const [tab, setTab] = useState<Tab>("list");

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as Tab)}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
        <TabsList className="flex h-auto min-h-11 w-full flex-wrap justify-start gap-1 rounded-2xl border border-border/60 bg-muted/70 p-1.5 shadow-inner sm:max-w-none md:flex-1">
          <TabsTrigger value="list" className="gap-1.5 rounded-xl data-[active]:shadow-sm">
            <ListVideo className="size-4" />
            Video list
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="gap-1.5 rounded-xl data-[active]:shadow-sm"
          >
            <AlarmClock className="size-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="single" className="gap-1.5 rounded-xl data-[active]:shadow-sm">
            <Plus className="size-4" />
            Single
          </TabsTrigger>
          <TabsTrigger value="multi" className="gap-1.5 rounded-xl data-[active]:shadow-sm">
            <Upload className="size-4" />
            Multi
          </TabsTrigger>
          <TabsTrigger value="playlist" className="gap-1.5 rounded-xl data-[active]:shadow-sm">
            <ListMusic className="size-4" />
            Playlist
          </TabsTrigger>
        </TabsList>
        <Button
          render={<Link href="/" />}
          variant="outline"
          size="default"
          className="shrink-0 gap-2 sm:self-center"
        >
          <House className="size-4" data-icon="inline-start" />
          Home
        </Button>
      </div>

      <TabsContent value="list" className="mt-0 outline-none">
        <VideoList />
      </TabsContent>
      <TabsContent value="settings" className="mt-0 outline-none">
        <SettingsPanel />
      </TabsContent>
      <TabsContent value="single" className="mt-0 outline-none">
        <SingleUpload />
      </TabsContent>
      <TabsContent value="multi" className="mt-0 outline-none">
        <MultiUpload />
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
      <Card className="rounded-2xl border-border/70 shadow-lg shadow-black/[0.04]">
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading…
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-2xl border-border/70 shadow-lg shadow-black/[0.04]">
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
    <Card className="rounded-2xl border-border/70 shadow-lg shadow-black/[0.04]">
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
  startSeconds: string;
  endSeconds: string;
};

const blank: FormState = {
  title: "",
  description: "",
  videoUrl: "",
  thumbnailUrl: "",
  startSeconds: "",
  endSeconds: "",
};

function toPayload(s: FormState): {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  startSeconds: number | null;
  endSeconds: number | null;
} {
  return {
    title: s.title.trim(),
    description: s.description,
    videoUrl: s.videoUrl.trim(),
    thumbnailUrl: s.thumbnailUrl.trim() || null,
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
    </div>
  );
}

function SingleUpload(): ReactElement {
  const qc = useQueryClient();
  const [s, setS] = useState<FormState>(blank);
  const m = useMutation({
    mutationFn: () => createVideo(toPayload(s)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      setS(blank);
    },
  });
  return (
    <Card className="rounded-2xl border-border/70 shadow-lg shadow-black/[0.04]">
      <CardHeader>
        <CardTitle>Add a video</CardTitle>
        <CardDescription>
          Paste a title and YouTube link. Optional clip times trim the segment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormFields s={s} setS={setS} />
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => m.mutate()}
            disabled={!s.title || !s.videoUrl || m.isPending}
          >
            {m.isPending ? "Saving…" : "Save video"}
          </Button>
        </div>
        {m.isError ? (
          <p className="text-sm text-destructive">Save failed.</p>
        ) : null}
        {m.isSuccess ? (
          <p className="text-sm text-emerald-600">Saved successfully.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

type Row = FormState & {
  status: "idle" | "uploading" | "saved" | "error";
  error?: string;
};

function MultiUpload(): ReactElement {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([{ ...blank, status: "idle" }]);

  const updateRow = (i: number, patch: Partial<Row>): void =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addRow = (): void =>
    setRows((rs) => [...rs, { ...blank, status: "idle" }]);
  const removeRow = (i: number): void =>
    setRows((rs) => rs.filter((_, idx) => idx !== i));

  const submitAll = async (): Promise<void> => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.status === "saved") continue;
      if (!r.title || !r.videoUrl) continue;
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
    setTimeout(() => {
      setRows((rs) => {
        const remaining = rs.filter((r) => r.status !== "saved");
        return remaining.length ? remaining : [{ ...blank, status: "idle" }];
      });
    }, 600);
  };

  return (
    <Card className="rounded-2xl border-border/70 shadow-lg shadow-black/[0.04]">
      <CardHeader>
        <CardTitle>Multi upload</CardTitle>
        <CardDescription>
          Add several rows, then save all in one go.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {rows.map((r, i) => (
            <Card
              key={i}
              className={cn(
                "shadow-none",
                r.status === "saved" && "border-emerald-500/40 bg-emerald-50/50",
                r.status === "error" && "border-destructive/50 bg-destructive/5",
                r.status === "uploading" && "border-amber-500/40 bg-amber-50/50",
              )}
            >
              <CardContent className="space-y-3 pt-6">
                <FormFields s={r} setS={(next) => updateRow(i, next)} />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {r.status === "saved" && "Saved"}
                    {r.status === "uploading" && "Uploading…"}
                    {r.status === "error" && (
                      <span className="text-destructive">{r.error}</span>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => removeRow(i)}
                  >
                    Remove row
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" variant="secondary" onClick={addRow}>
            Add another row
          </Button>
          <Button type="button" onClick={() => void submitAll()}>
            Save all
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
    <Card className="rounded-2xl border-border/70 shadow-lg shadow-black/[0.04]">
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
