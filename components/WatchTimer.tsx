"use client";

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Moon, Sun, Sparkles } from "lucide-react";
import { useWatchTimer } from "@/lib/timer-store";
import { getSettings } from "@/lib/api";
import { cn } from "@/lib/utils";

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.max(0, Math.floor(s % 60));
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function WatchTimerBar(): ReactElement | null {
  const { remaining, totalSeconds, expired, setTotalSeconds } = useWatchTimer();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setTotalSeconds(settings.screenTimeMinutes * 60);
  }, [settings, setTotalSeconds]);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const remainingRatio = Math.max(0, Math.min(1, remaining / totalSeconds));

  type State = {
    gradient: string;
    chip: string;
    label: string;
    Icon: typeof Sun;
  };

  let state: State = {
    gradient:
      "linear-gradient(90deg, var(--tots-mint), color-mix(in srgb, var(--tots-mint) 50%, var(--tots-sunshine)))",
    chip: "bg-[color:var(--tots-mint)] text-[color:var(--tots-ink)]",
    label: "Screen time left",
    Icon: Sun,
  };

  if (expired) {
    state = {
      gradient:
        "linear-gradient(90deg, var(--tots-cheek), var(--tots-pink))",
      chip: "bg-[color:var(--tots-pink)] text-[color:var(--tots-ink)]",
      label: "Paused — take a break",
      Icon: Moon,
    };
  } else if (remaining <= 120) {
    state = {
      gradient:
        "linear-gradient(90deg, var(--tots-peach), var(--tots-pink))",
      chip: "bg-[color:var(--tots-peach)] text-[color:var(--tots-ink)]",
      label: "Almost done",
      Icon: Sparkles,
    };
  } else if (remaining <= 300) {
    state = {
      gradient:
        "linear-gradient(90deg, var(--tots-sunshine), var(--tots-peach))",
      chip: "bg-[color:var(--tots-sunshine)] text-[color:var(--tots-ink)]",
      label: "Wrapping up soon",
      Icon: Sun,
    };
  }

  const { Icon } = state;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-4 pt-2 sm:px-6">
      <div
        className={cn(
          "mx-auto max-w-3xl overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/85 shadow-[0_20px_50px_-15px_rgba(80,90,160,0.45)] ring-1 ring-black/[0.04] backdrop-blur-xl",
        )}
      >
        {/* progress bar */}
        <div className="relative h-2 w-full bg-black/[0.05]" aria-hidden>
          <div
            className="h-full rounded-r-full transition-[width] duration-500 ease-linear"
            style={{ width: `${remainingRatio * 100}%`, background: state.gradient }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap sm:gap-4 sm:px-5">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ring-1 ring-black/[0.05]",
              state.chip,
            )}
          >
            <Icon className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {state.label}
            </p>
            <p className="font-display text-3xl font-bold tabular-nums leading-none tracking-tight text-foreground sm:text-4xl">
              {expired ? "0:00" : fmt(remaining)}
            </p>
          </div>
          <span
            className="hidden text-2xl animate-float-slow sm:inline-block"
            aria-hidden
          >
            {expired ? "🌙" : remaining <= 120 ? "🌅" : "🌈"}
          </span>
        </div>
      </div>
    </div>
  );
}
