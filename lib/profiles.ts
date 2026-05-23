"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ChildProfile, Video } from "@/db/schema";

const ACTIVE_PROFILE_KEY = "babytube.active-profile.v1";

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function readActiveProfileId(): string | null {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(ACTIVE_PROFILE_KEY);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export type ProfilesState = {
  childProfiles: ChildProfile[];
};

export function setActiveChildProfileId(profileId: string | null): void {
  if (typeof window === "undefined") return;

  if (profileId) window.localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  else window.localStorage.removeItem(ACTIVE_PROFILE_KEY);

  notify();
}

export function useActiveChildProfileId(): string | null {
  return useSyncExternalStore(subscribe, readActiveProfileId, () => null);
}

export function useActiveChildProfile(
  profiles: readonly ChildProfile[] | undefined,
): ChildProfile | null {
  const activeProfileId = useActiveChildProfileId();

  return useMemo(() => {
    if (!profiles?.length) return null;

    return (
      profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0]
    );
  }, [activeProfileId, profiles]);
}

export function filterVideosForProfile(
  videos: readonly Video[],
  profile: ChildProfile | null,
): Video[] {
  if (!profile || profile.preferredCategories.length === 0) return [...videos];

  const preferredCategories = new Set(profile.preferredCategories);

  return videos.filter((video) =>
    video.categories.some((category) => preferredCategories.has(category)),
  );
}

export function createProfileId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `profile-${Date.now().toString(36)}`;
}
