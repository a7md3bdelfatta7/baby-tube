"use client";

import type { ReactElement } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, type ThemeMode } from "@/lib/theme-store";

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  auto: "light",
  light: "dark",
  dark: "auto",
};

const MODE_LABEL: Record<ThemeMode, string> = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
};

/**
 * Cycles auto (follows local daylight hours) -> light -> dark -> auto.
 * The icon always reflects the effective (resolved) appearance.
 */
export function ThemeToggle(): ReactElement {
  const { mode, effective, setMode } = useTheme();
  const Icon = mode === "auto" ? SunMoon : effective === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={() => setMode(NEXT_MODE[mode])}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-xs font-semibold text-foreground shadow-sm ring-1 ring-black/[0.04] backdrop-blur transition",
        "hover:-translate-y-0.5 hover:bg-background",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40",
      )}
      aria-label={`Theme: ${MODE_LABEL[mode]}. Click to change.`}
      title={`Theme: ${MODE_LABEL[mode]} (click to change)`}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="hidden sm:inline">{MODE_LABEL[mode]}</span>
    </button>
  );
}
