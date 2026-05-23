"use client";

import { useEffect, useSyncExternalStore } from "react";

const TOTAL_SECONDS = 15 * 60;
const DEFAULT_RESET_HOURS = 24;
const DEFAULT_PROFILE_KEY = "__default__";
const STORAGE_KEY = "babytube.timer.v1";

type State = {
  profileId: string | null;
  remaining: number;
  totalSeconds: number;
  isPlaying: boolean;
  expired: boolean;
  resetEveryHours: number;
  lastResetAt: number;
};

type PersistedTimer = {
  remaining: number;
  totalSeconds: number;
  expired: boolean;
  resetEveryHours: number;
  lastResetAt: number;
};

type StoredTimers = {
  activeKey: string;
  timers: Record<string, PersistedTimer>;
};

let state: State = {
  profileId: null,
  remaining: TOTAL_SECONDS,
  totalSeconds: TOTAL_SECONDS,
  isPlaying: false,
  expired: false,
  resetEveryHours: DEFAULT_RESET_HOURS,
  lastResetAt: Date.now(),
};
const listeners = new Set<() => void>();
let timers: Record<string, PersistedTimer> = {};
let currentKey = DEFAULT_PROFILE_KEY;
let interval: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function notify(): void {
  for (const l of listeners) l();
}

function profileKey(profileId: string | null): string {
  return profileId ?? DEFAULT_PROFILE_KEY;
}

function profileIdFromKey(key: string): string | null {
  return key === DEFAULT_PROFILE_KEY ? null : key;
}

function safeTotalSeconds(value: unknown): number {
  return typeof value === "number"
    ? Math.max(60, Math.floor(value))
    : TOTAL_SECONDS;
}

function safeResetEveryHours(value: unknown): number {
  return typeof value === "number"
    ? Math.min(168, Math.max(1, Math.floor(value)))
    : DEFAULT_RESET_HOURS;
}

function createTimer(
  totalSeconds = TOTAL_SECONDS,
  resetEveryHours = DEFAULT_RESET_HOURS,
): PersistedTimer {
  return {
    remaining: totalSeconds,
    totalSeconds,
    expired: false,
    resetEveryHours,
    lastResetAt: Date.now(),
  };
}

function normalizeTimer(value: unknown): PersistedTimer | null {
  if (!value || typeof value !== "object") return null;

  const timer = value as Partial<PersistedTimer>;
  const totalSeconds = safeTotalSeconds(timer.totalSeconds);
  const remaining =
    typeof timer.remaining === "number"
      ? Math.min(totalSeconds, Math.max(0, Math.floor(timer.remaining)))
      : totalSeconds;
  const lastResetAt =
    typeof timer.lastResetAt === "number" && Number.isFinite(timer.lastResetAt)
      ? timer.lastResetAt
      : Date.now();

  return {
    remaining,
    totalSeconds,
    expired: !!timer.expired || remaining <= 0,
    resetEveryHours: safeResetEveryHours(timer.resetEveryHours),
    lastResetAt,
  };
}

function resetIfDue(timer: PersistedTimer): PersistedTimer {
  const resetIntervalMs = timer.resetEveryHours * 60 * 60 * 1000;
  const isDue = Date.now() - timer.lastResetAt >= resetIntervalMs;

  if (!isDue) return timer;

  return {
    ...timer,
    remaining: timer.totalSeconds,
    expired: false,
    lastResetAt: Date.now(),
  };
}

function applyTimer(key: string, timer: PersistedTimer): void {
  currentKey = key;
  timers[key] = timer;
  state = {
    profileId: profileIdFromKey(key),
    remaining: timer.remaining,
    totalSeconds: timer.totalSeconds,
    isPlaying: state.isPlaying && !timer.expired,
    expired: timer.expired,
    resetEveryHours: timer.resetEveryHours,
    lastResetAt: timer.lastResetAt,
  };
}

function syncCurrentTimer(): void {
  timers[currentKey] = {
    remaining: state.remaining,
    totalSeconds: state.totalSeconds,
    expired: state.expired,
    resetEveryHours: state.resetEveryHours,
    lastResetAt: state.lastResetAt,
  };
}

function persist(): void {
  if (typeof window === "undefined") return;
  syncCurrentTimer();
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeKey: currentKey,
        timers,
      }),
    );
  } catch {}
}

function ensureInit(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);

      if (parsed?.timers && typeof parsed.timers === "object") {
        const stored = parsed as StoredTimers;
        timers = Object.fromEntries(
          Object.entries(stored.timers)
            .map(([key, timer]) => [key, normalizeTimer(timer)] as const)
            .filter((entry): entry is readonly [string, PersistedTimer] => {
              return entry[1] !== null;
            }),
        );
        currentKey =
          typeof stored.activeKey === "string"
            ? stored.activeKey
            : DEFAULT_PROFILE_KEY;
      } else {
        const legacyTimer = normalizeTimer(parsed);
        if (legacyTimer) {
          timers = { [DEFAULT_PROFILE_KEY]: legacyTimer };
        }
      }
    }
  } catch {}

  const timer = resetIfDue(timers[currentKey] ?? createTimer());
  applyTimer(currentKey, timer);
  persist();
}

function tick(): void {
  ensureInit();
  if (!state.isPlaying || state.expired) return;
  const next = state.remaining - 1;
  if (next <= 0) {
    state = { ...state, remaining: 0, isPlaying: false, expired: true };
  } else {
    state = { ...state, remaining: next };
  }
  persist();
  notify();
}

function startInterval(): void {
  if (interval != null) return;
  interval = setInterval(tick, 1000);
}

function stopInterval(): void {
  if (interval != null) {
    clearInterval(interval);
    interval = null;
  }
}

export const timerStore = {
  configure({
    profileId,
    totalSeconds,
    resetEveryHours,
  }: {
    profileId: string | null;
    totalSeconds: number;
    resetEveryHours: number;
  }): void {
    ensureInit();
    syncCurrentTimer();

    const key = profileKey(profileId);
    const nextTotal = safeTotalSeconds(totalSeconds);
    const nextResetEveryHours = safeResetEveryHours(resetEveryHours);
    const existing = timers[key] ?? createTimer(nextTotal, nextResetEveryHours);
    const timer =
      existing.totalSeconds === nextTotal
        ? resetIfDue({
            ...existing,
            resetEveryHours: nextResetEveryHours,
          })
        : createTimer(nextTotal, nextResetEveryHours);

    const wasState = state;
    applyTimer(key, timer);
    persist();

    if (
      wasState.profileId !== state.profileId ||
      wasState.remaining !== state.remaining ||
      wasState.totalSeconds !== state.totalSeconds ||
      wasState.expired !== state.expired ||
      wasState.resetEveryHours !== state.resetEveryHours
    ) {
      notify();
    }
  },
  setPlaying(playing: boolean): void {
    ensureInit();
    const resetTimer = resetIfDue(timers[currentKey] ?? createTimer());
    if (resetTimer.lastResetAt !== state.lastResetAt) {
      applyTimer(currentKey, resetTimer);
      persist();
      notify();
    }
    if (state.expired) {
      state = { ...state, isPlaying: false };
      stopInterval();
      notify();
      return;
    }
    if (state.isPlaying === playing) return;
    state = { ...state, isPlaying: playing };
    if (playing) startInterval();
    else stopInterval();
    notify();
  },
  setTotalSeconds(totalSeconds: number): void {
    ensureInit();
    const nextTotal = Math.max(60, Math.floor(totalSeconds));
    if (state.totalSeconds === nextTotal) return;

    state = {
      ...state,
      remaining: nextTotal,
      totalSeconds: nextTotal,
      isPlaying: state.isPlaying,
      expired: false,
      lastResetAt: Date.now(),
    };
    persist();
    if (state.isPlaying) startInterval();
    notify();
  },
  reset(): void {
    ensureInit();
    state = {
      ...state,
      remaining: state.totalSeconds,
      totalSeconds: state.totalSeconds,
      isPlaying: state.isPlaying,
      expired: false,
      lastResetAt: Date.now(),
    };
    persist();
    if (state.isPlaying) startInterval();
    notify();
  },
  subscribe(l: () => void): () => void {
    ensureInit();
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  get(): State {
    ensureInit();
    const resetTimer = resetIfDue(timers[currentKey] ?? createTimer());
    if (resetTimer.lastResetAt !== state.lastResetAt) {
      applyTimer(currentKey, resetTimer);
      persist();
    }
    return state;
  },
};

const SERVER_SNAPSHOT: State = {
  profileId: null,
  remaining: TOTAL_SECONDS,
  totalSeconds: TOTAL_SECONDS,
  isPlaying: false,
  expired: false,
  resetEveryHours: DEFAULT_RESET_HOURS,
  lastResetAt: 0,
};

export function useWatchTimer(): State & {
  configure: (input: {
    profileId: string | null;
    totalSeconds: number;
    resetEveryHours: number;
  }) => void;
  reset: () => void;
  setPlaying: (playing: boolean) => void;
  setTotalSeconds: (totalSeconds: number) => void;
} {
  const s = useSyncExternalStore(
    timerStore.subscribe,
    timerStore.get,
    () => SERVER_SNAPSHOT,
  );
  return {
    ...s,
    configure: timerStore.configure,
    reset: timerStore.reset,
    setPlaying: timerStore.setPlaying,
    setTotalSeconds: timerStore.setTotalSeconds,
  };
}

// Hook that signals video play/pause to the timer
export function useReportPlayState(playing: boolean): void {
  useEffect(() => {
    timerStore.setPlaying(playing);
    return () => {
      timerStore.setPlaying(false);
    };
  }, [playing]);
}
