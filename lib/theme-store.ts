"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "babytube.theme.v1";
// Simple local-clock daylight window used for automatic mode. No geolocation
// permission is requested for this — it's a fixed heuristic, not sunrise/sunset.
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 19;
const AUTO_RECHECK_MS = 60_000;

export type ThemeMode = "auto" | "light" | "dark";
export type EffectiveTheme = "light" | "dark";

type State = {
  mode: ThemeMode;
  effective: EffectiveTheme;
};

function isDaytime(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR;
}

function resolveEffective(mode: ThemeMode): EffectiveTheme {
  if (mode === "light" || mode === "dark") return mode;
  return isDaytime() ? "light" : "dark";
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "auto") return raw;
  } catch {}
  return "auto";
}

function applyToDocument(effective: EffectiveTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", effective === "dark");
  root.style.colorScheme = effective;
}

let state: State = { mode: "auto", effective: "light" };
const listeners = new Set<() => void>();
let initialized = false;
let interval: ReturnType<typeof setInterval> | null = null;

function notify(): void {
  for (const l of listeners) l();
}

function recheckAuto(): void {
  if (state.mode !== "auto") return;
  const next = resolveEffective(state.mode);
  if (next === state.effective) return;
  state = { ...state, effective: next };
  applyToDocument(next);
  notify();
}

function registerAutoRecheck(): void {
  if (typeof window === "undefined") return;
  if (interval == null) interval = setInterval(recheckAuto, AUTO_RECHECK_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") return;
    recheckAuto();
  });
  window.addEventListener("focus", recheckAuto);
}

function ensureInit(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const mode = readStoredMode();
  state = { mode, effective: resolveEffective(mode) };
  applyToDocument(state.effective);
  registerAutoRecheck();
}

export const themeStore = {
  setMode(mode: ThemeMode): void {
    ensureInit();
    if (state.mode === mode) return;
    state = { mode, effective: resolveEffective(mode) };
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
    applyToDocument(state.effective);
    notify();
  },
  subscribe(listener: () => void): () => void {
    ensureInit();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get(): State {
    ensureInit();
    return state;
  },
};

const SERVER_SNAPSHOT: State = { mode: "auto", effective: "light" };

export function useTheme(): State & { setMode: (mode: ThemeMode) => void } {
  const snapshot = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.get,
    () => SERVER_SNAPSHOT,
  );
  return { ...snapshot, setMode: themeStore.setMode };
}
