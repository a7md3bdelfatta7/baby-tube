"use client";

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun, Sparkles } from "lucide-react";
import { useWatchTimer } from "@/lib/timer-store";
import { getProfiles, getSettings } from "@/lib/api";
import { useActiveChildProfile } from "@/lib/profiles";
import { cn } from "@/lib/utils";

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.max(0, Math.floor(s % 60));
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

type TimerVisualState = {
  gradient: string;
  chip: string;
  label: string;
  Icon: typeof Sun;
};

type TimerViewModel = {
  remaining: number;
  remainingRatio: number;
  expired: boolean;
  state: TimerVisualState;
  activeProfileName: string | null;
  emoji: string;
};

function useTimerViewModel(): TimerViewModel | null {
  const { remaining, totalSeconds, expired, configure } = useWatchTimer();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
  });
  const activeProfile = useActiveChildProfile(profiles?.childProfiles);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const screenTimeMinutes =
      activeProfile?.screenTimeMinutes ?? settings?.screenTimeMinutes;

    if (!screenTimeMinutes) return;

    configure({
      profileId: activeProfile?.id ?? null,
      totalSeconds: screenTimeMinutes * 60,
      resetEveryHours: activeProfile?.screenTimeResetHours ?? 24,
    });
  }, [activeProfile, configure, settings]);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const remainingRatio = Math.max(0, Math.min(1, remaining / totalSeconds));

  let state: TimerVisualState = {
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

  return {
    remaining,
    remainingRatio,
    expired,
    state,
    activeProfileName: activeProfile?.name ?? null,
    emoji: expired ? "🌙" : remaining <= 120 ? "🌅" : "🌈",
  };
}

export function WatchTimerCard(): ReactElement | null {
  const timer = useTimerViewModel();

  if (!timer) return null;

  const { Icon } = timer.state;

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/75 shadow-[0_16px_40px_-24px_rgba(61,61,92,0.32)] ring-1 ring-black/[0.03] backdrop-blur-xl">
      <div className="relative h-2 w-full bg-black/[0.05]" aria-hidden>
        <div
          className="h-full rounded-r-full transition-[width] duration-500 ease-linear"
          style={{
            width: `${timer.remainingRatio * 100}%`,
            background: timer.state.gradient,
          }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-inner ring-1 ring-black/[0.05]",
              timer.state.chip,
            )}
          >
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {timer.activeProfileName
                ? `${timer.state.label} for ${timer.activeProfileName}`
                : timer.state.label}
            </p>
            <p className="font-display text-3xl font-bold tabular-nums leading-none tracking-tight text-foreground">
              {timer.expired ? "0:00" : fmt(timer.remaining)}
            </p>
          </div>
          <span className="text-2xl" aria-hidden>
            {timer.emoji}
          </span>
        </div>
      </div>
    </section>
  );
}

export function WatchTimerBar(): ReactElement | null {
  const pathname = usePathname();
  const timer = useTimerViewModel();

  if (!timer || pathname === "/") return null;

  const { Icon } = timer.state;

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
            style={{
              width: `${timer.remainingRatio * 100}%`,
              background: timer.state.gradient,
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap sm:gap-4 sm:px-5">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ring-1 ring-black/[0.05]",
              timer.state.chip,
            )}
          >
            <Icon className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {timer.activeProfileName
                ? `${timer.state.label} for ${timer.activeProfileName}`
                : timer.state.label}
            </p>
            <p className="font-display text-3xl font-bold tabular-nums leading-none tracking-tight text-foreground sm:text-4xl">
              {timer.expired ? "0:00" : fmt(timer.remaining)}
            </p>
          </div>
          <span
            className="hidden text-2xl animate-float-slow sm:inline-block"
            aria-hidden
          >
            {timer.emoji}
          </span>
        </div>
      </div>
    </div>
  );
}
