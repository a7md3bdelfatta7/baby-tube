"use client";

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Moon, Sun, Sparkles } from "lucide-react";
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

  if (!timer || pathname === "/" || pathname === "/listen") return null;

  const { Icon } = timer.state;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2 sm:px-6">
      <div
        className={cn(
          "mx-auto max-w-md overflow-hidden rounded-[1.25rem] border border-white/60 bg-white/85 shadow-[0_16px_40px_-15px_rgba(80,90,160,0.45)] ring-1 ring-black/[0.04] backdrop-blur-xl",
        )}
      >
        {/* progress bar */}
        <div className="relative h-1.5 w-full bg-black/[0.05]" aria-hidden>
          <div
            className="h-full rounded-r-full transition-[width] duration-500 ease-linear"
            style={{
              width: `${timer.remainingRatio * 100}%`,
              background: timer.state.gradient,
            }}
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-xl shadow-inner ring-1 ring-black/[0.05]",
              timer.state.chip,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {timer.activeProfileName
                ? `${timer.state.label} for ${timer.activeProfileName}`
                : timer.state.label}
            </p>
            <p className="font-display text-lg font-bold tabular-nums leading-none tracking-tight text-foreground">
              {timer.expired ? "0:00" : fmt(timer.remaining)}
            </p>
          </div>
          <Link
            href="/"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[color:var(--tots-ink)] px-3 py-2 text-xs font-semibold text-[color:var(--tots-cream)] shadow-lg shadow-[color:var(--tots-ink)]/25 transition",
              "hover:-translate-y-0.5 hover:brightness-110",
            )}
          >
            <Home className="size-3.5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
