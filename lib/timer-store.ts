"use client";

import { useEffect, useSyncExternalStore } from "react";

const TOTAL_SECONDS = 15 * 60;
const STORAGE_KEY = "babytube.timer.v1";

type State = {
  remaining: number;
  totalSeconds: number;
  isPlaying: boolean;
  expired: boolean;
};

let state: State = {
  remaining: TOTAL_SECONDS,
  totalSeconds: TOTAL_SECONDS,
  isPlaying: false,
  expired: false,
};
const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function notify(): void {
  for (const l of listeners) l();
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        remaining: state.remaining,
        totalSeconds: state.totalSeconds,
        expired: state.expired,
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
      const totalSeconds =
        typeof parsed.totalSeconds === "number"
          ? Math.max(60, parsed.totalSeconds)
          : TOTAL_SECONDS;
      if (typeof parsed.remaining === "number") {
        state = {
          remaining: Math.min(totalSeconds, Math.max(0, parsed.remaining)),
          totalSeconds,
          isPlaying: false,
          expired: !!parsed.expired || parsed.remaining <= 0,
        };
      }
    }
  } catch {}
}

function tick(): void {
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
  setPlaying(playing: boolean): void {
    ensureInit();
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
      remaining: nextTotal,
      totalSeconds: nextTotal,
      isPlaying: state.isPlaying,
      expired: false,
    };
    persist();
    if (state.isPlaying) startInterval();
    notify();
  },
  reset(): void {
    ensureInit();
    state = {
      remaining: state.totalSeconds,
      totalSeconds: state.totalSeconds,
      isPlaying: state.isPlaying,
      expired: false,
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
    return state;
  },
};

const SERVER_SNAPSHOT: State = {
  remaining: TOTAL_SECONDS,
  totalSeconds: TOTAL_SECONDS,
  isPlaying: false,
  expired: false,
};

export function useWatchTimer(): State & {
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
