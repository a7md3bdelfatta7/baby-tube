"use client";

import type { AppSettings, ChildProfile, Video } from "@/db/schema";
import type { QueueState } from "@/lib/queue";
import type { ProfilesState } from "@/lib/profiles";

function adminHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const pw = localStorage.getItem("babytube.admin.pw");
  return pw ? { "x-admin-password": pw } : {};
}

export async function listVideos(): Promise<Video[]> {
  const res = await fetch("/api/videos", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load videos");
  return res.json();
}

export async function createVideo(input: Partial<Video>): Promise<Video> {
  const res = await fetch("/api/videos", {
    method: "POST",
    headers: { "content-type": "application/json", ...adminHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json()).error?.message ?? "Failed");
  return res.json();
}

export async function updateVideo(
  id: number,
  input: Partial<Video>,
): Promise<Video> {
  const res = await fetch(`/api/videos/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...adminHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
}

export async function deleteVideo(id: number): Promise<void> {
  const res = await fetch(`/api/videos/${id}`, {
    method: "DELETE",
    headers: { ...adminHeaders() },
  });
  if (!res.ok) throw new Error("Failed to delete");
}

export async function getQueue(): Promise<QueueState> {
  const res = await fetch("/api/queue", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load queue");
  return res.json();
}

export async function updateQueue(input: QueueState): Promise<QueueState> {
  const res = await fetch("/api/queue", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...adminHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json()).error?.message ?? "Failed");
  return res.json();
}

export async function importPlaylist(
  url: string,
): Promise<{ imported: number; skipped: number }> {
  const res = await fetch("/api/videos/import-playlist", {
    method: "POST",
    headers: { "content-type": "application/json", ...adminHeaders() },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Import failed");
  return res.json();
}

export async function getSettings(): Promise<AppSettings> {
  const res = await fetch("/api/settings", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

export async function updateSettings(input: {
  screenTimeMinutes: number;
}): Promise<AppSettings> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...adminHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json()).error?.message ?? "Failed");
  return res.json();
}

export async function getProfiles(): Promise<ProfilesState> {
  const res = await fetch("/api/profiles", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load profiles");
  return res.json();
}

export async function updateProfiles(input: ProfilesState): Promise<ProfilesState> {
  const res = await fetch("/api/profiles", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...adminHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json()).error?.message ?? "Failed");
  return res.json();
}

export async function recordWatchHistory(input: {
  profileId: string;
  video: Pick<Video, "id" | "title">;
  status: "completed" | "skipped";
  watchedSeconds: number;
}): Promise<ProfilesState> {
  const res = await fetch("/api/profiles/watch-history", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      profileId: input.profileId,
      videoId: input.video.id,
      title: input.video.title,
      status: input.status,
      watchedSeconds: input.watchedSeconds,
    }),
  });
  if (!res.ok) throw new Error("Failed to record watch history");
  return res.json();
}
