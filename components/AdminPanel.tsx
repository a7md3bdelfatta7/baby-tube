"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  createVideo,
  deleteVideo,
  importPlaylist,
  listVideos,
  updateVideo,
} from "@/lib/api";
import type { Video } from "@/db/schema";

type Tab = "single" | "multi" | "playlist" | "list";

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("list");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-center">
        {(
          [
            ["list", "📋 Video List"],
            ["single", "➕ Single Upload"],
            ["multi", "📚 Multi Upload"],
            ["playlist", "🎶 Import Playlist"],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-full font-bold border-2 ${
              tab === k
                ? "bg-pink-500 text-white border-pink-500"
                : "bg-white text-pink-600 border-pink-200 hover:border-pink-400"
            }`}
          >
            {label}
          </button>
        ))}
        <Link
          href="/"
          className="px-4 py-2 rounded-full font-bold bg-white text-purple-600 border-2 border-purple-200"
        >
          ← Home
        </Link>
      </div>

      {tab === "list" && <VideoList />}
      {tab === "single" && <SingleUpload />}
      {tab === "multi" && <MultiUpload />}
      {tab === "playlist" && <PlaylistImport />}
    </div>
  );
}

function fmtClip(v: Video) {
  if (v.startSeconds == null && v.endSeconds == null) return "full";
  return `${v.startSeconds ?? 0}s → ${v.endSeconds ?? "end"}`;
}

function VideoList() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const del = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });

  if (isLoading) return <div className="text-center">Loading…</div>;

  return (
    <div className="bg-white/80 rounded-3xl p-5 shadow border-4 border-pink-100">
      <div className="text-purple-700 font-bold mb-3">
        {data?.length ?? 0} videos
      </div>
      <ul className="space-y-2">
        {data?.map((v) =>
          editingId === v.id ? (
            <EditRow
              key={v.id}
              video={v}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          ) : (
            <li
              key={v.id}
              className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-pink-100"
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-purple-700 truncate">
                  {v.title}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {v.videoUrl} · clip: {fmtClip(v)}
                </div>
              </div>
              <button
                onClick={() => setEditingId(v.id)}
                className="text-pink-600 hover:text-pink-800 px-2"
                aria-label="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${v.title}"?`)) del.mutate(v.id);
                }}
                className="text-red-500 hover:text-red-700 px-2"
                aria-label="Delete"
              >
                🗑️
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
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

function toPayload(s: FormState) {
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
}) {
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
    <li className="bg-pink-50 rounded-2xl p-3 border border-pink-200">
      <FormFields s={s} setS={setS} />
      <div className="flex gap-2 mt-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded-lg bg-white border border-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={() => m.mutate(toPayload(s))}
          disabled={m.isPending}
          className="px-3 py-1 rounded-lg bg-pink-500 text-white font-bold disabled:opacity-50"
        >
          {m.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </li>
  );
}

function FormFields({
  s,
  setS,
}: {
  s: FormState;
  setS: (s: FormState) => void;
}) {
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setS({ ...s, [k]: e.target.value });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <input className={inputCls} placeholder="Title" value={s.title} onChange={set("title")} />
      <input className={inputCls} placeholder="YouTube URL" value={s.videoUrl} onChange={set("videoUrl")} />
      <input className={inputCls} placeholder="Thumbnail URL (optional)" value={s.thumbnailUrl} onChange={set("thumbnailUrl")} />
      <div className="flex gap-2">
        <input className={inputCls + " w-1/2"} placeholder="Start (s)" value={s.startSeconds} onChange={set("startSeconds")} />
        <input className={inputCls + " w-1/2"} placeholder="End (s)" value={s.endSeconds} onChange={set("endSeconds")} />
      </div>
      <textarea className={inputCls + " md:col-span-2"} placeholder="Description (optional)" value={s.description} onChange={set("description")} />
    </div>
  );
}

const inputCls =
  "rounded-xl border-2 border-pink-200 px-3 py-2 focus:outline-none focus:border-pink-400 bg-white";

function SingleUpload() {
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
    <div className="bg-white/80 rounded-3xl p-5 shadow border-4 border-pink-100">
      <h2 className="text-xl font-bold text-purple-700 mb-3">➕ Add a video</h2>
      <FormFields s={s} setS={setS} />
      <div className="flex justify-end mt-3">
        <button
          onClick={() => m.mutate()}
          disabled={!s.title || !s.videoUrl || m.isPending}
          className="px-5 py-2 rounded-xl bg-pink-500 text-white font-bold disabled:opacity-50"
        >
          {m.isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {m.isError && <div className="text-red-500 text-sm mt-2">Save failed.</div>}
      {m.isSuccess && <div className="text-green-600 text-sm mt-2">Saved! ✨</div>}
    </div>
  );
}

type Row = FormState & {
  status: "idle" | "uploading" | "saved" | "error";
  error?: string;
};

function MultiUpload() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([{ ...blank, status: "idle" }]);

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addRow = () => setRows((rs) => [...rs, { ...blank, status: "idle" }]);
  const removeRow = (i: number) =>
    setRows((rs) => rs.filter((_, idx) => idx !== i));

  const submitAll = async () => {
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
    // auto-clear saved rows
    setTimeout(() => {
      setRows((rs) => {
        const remaining = rs.filter((r) => r.status !== "saved");
        return remaining.length ? remaining : [{ ...blank, status: "idle" }];
      });
    }, 600);
  };

  return (
    <div className="bg-white/80 rounded-3xl p-5 shadow border-4 border-pink-100">
      <h2 className="text-xl font-bold text-purple-700 mb-3">📚 Multi upload</h2>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            className={`p-3 rounded-2xl border-2 ${
              r.status === "saved"
                ? "border-green-300 bg-green-50"
                : r.status === "error"
                  ? "border-red-300 bg-red-50"
                  : r.status === "uploading"
                    ? "border-amber-300 bg-amber-50"
                    : "border-pink-100 bg-white"
            }`}
          >
            <FormFields s={r} setS={(s) => updateRow(i, s)} />
            <div className="flex items-center justify-between mt-2 text-sm">
              <span>
                {r.status === "saved" && "✅ saved"}
                {r.status === "uploading" && "⏳ uploading…"}
                {r.status === "error" && `❌ ${r.error}`}
                {r.status === "idle" && " "}
              </span>
              <button
                onClick={() => removeRow(i)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3">
        <button
          onClick={addRow}
          className="px-4 py-2 rounded-xl bg-purple-100 text-purple-700 font-bold"
        >
          + Add another
        </button>
        <button
          onClick={submitAll}
          className="px-5 py-2 rounded-xl bg-pink-500 text-white font-bold"
        >
          Save all
        </button>
      </div>
    </div>
  );
}

function PlaylistImport() {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const m = useMutation({
    mutationFn: () => importPlaylist(url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
  return (
    <div className="bg-white/80 rounded-3xl p-5 shadow border-4 border-pink-100">
      <h2 className="text-xl font-bold text-purple-700 mb-3">
        🎶 Import a YouTube playlist
      </h2>
      <input
        className={inputCls + " w-full"}
        placeholder="https://www.youtube.com/playlist?list=PL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="flex justify-end mt-3">
        <button
          onClick={() => m.mutate()}
          disabled={!url || m.isPending}
          className="px-5 py-2 rounded-xl bg-pink-500 text-white font-bold disabled:opacity-50"
        >
          {m.isPending ? "Importing…" : "Import"}
        </button>
      </div>
      {m.isSuccess && (
        <div className="text-green-600 text-sm mt-2">
          Imported {m.data.imported} videos ✨
          {m.data.skipped > 0 && ` (skipped ${m.data.skipped})`}
        </div>
      )}
      {m.isError && (
        <div className="text-red-500 text-sm mt-2">
          {(m.error as Error)?.message ?? "Failed"}
        </div>
      )}
    </div>
  );
}
