"use client";

import { useEffect, useSyncExternalStore } from "react";

const TOTAL_SECONDS = 15 * 60;
const STORAGE_KEY = "babytube.timer.v1";

type State = {
  remaining: number;
  isPlaying: boolean;
  expired: boolean;
};

let state: State = { remaining: TOTAL_SECONDS, isPlaying: false, expired: false };
const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function notify() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ remaining: state.remaining, expired: state.expired }),
    );
  } catch {}
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.remaining === "number") {
        state = {
          remaining: Math.max(0, parsed.remaining),
          isPlaying: false,
          expired: !!parsed.expired || parsed.remaining <= 0,
        };
      }
    }
  } catch {}
}

function tick() {
  if (!state.isPlaying || state.expired) return;
  const next = state.remaining - 1;
  if (next <= 0) {
    state = { remaining: 0, isPlaying: false, expired: true };
  } else {
    state = { ...state, remaining: next };
  }
  persist();
  notify();
}

function startInterval() {
  if (interval != null) return;
  interval = setInterval(tick, 1000);
}

function stopInterval() {
  if (interval != null) {
    clearInterval(interval);
    interval = null;
  }
}

export const timerStore = {
  setPlaying(playing: boolean) {
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
  reset() {
    ensureInit();
    state = { remaining: TOTAL_SECONDS, isPlaying: state.isPlaying, expired: false };
    persist();
    if (state.isPlaying) startInterval();
    notify();
  },
  subscribe(l: () => void) {
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
  isPlaying: false,
  expired: false,
};

export function useWatchTimer() {
  const s = useSyncExternalStore(
    timerStore.subscribe,
    timerStore.get,
    () => SERVER_SNAPSHOT,
  );
  return {
    ...s,
    reset: timerStore.reset,
    setPlaying: timerStore.setPlaying,
  };
}

// Hook that signals video play/pause to the timer
export function useReportPlayState(playing: boolean) {
  useEffect(() => {
    timerStore.setPlaying(playing);
    return () => {
      timerStore.setPlaying(false);
    };
  }, [playing]);
}
