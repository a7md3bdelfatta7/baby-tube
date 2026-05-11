"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { AlarmClock } from "lucide-react";
import { useWatchTimer } from "@/lib/timer-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.max(0, Math.floor(s % 60));
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function WatchTimerBar(): ReactElement | null {
  const { remaining, expired, reset } = useWatchTimer();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  let barAccent = "from-emerald-400/90 to-teal-500/90";
  let chip = "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100";
  let label = "Screen time left";

  if (expired) {
    barAccent = "from-rose-500 to-red-600";
    chip = "bg-destructive/15 text-destructive";
    label = "Paused — take a break";
  } else if (remaining <= 120) {
    barAccent = "from-orange-400 to-amber-500";
    chip = "bg-orange-500/15 text-orange-950 dark:text-orange-100";
    label = "Almost done";
  } else if (remaining <= 300) {
    barAccent = "from-amber-300 to-amber-500";
    chip = "bg-amber-400/20 text-amber-950 dark:text-amber-50";
    label = "Wrapping up soon";
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2">
      <Card
        className={cn(
          "mx-auto max-w-3xl overflow-hidden border-border/80 shadow-2xl shadow-black/15 backdrop-blur-xl",
          "bg-card/95 ring-1 ring-black/[0.06]",
        )}
      >
        <div
          className={cn(
            "h-1.5 w-full bg-gradient-to-r transition-all duration-500",
            barAccent,
          )}
          aria-hidden
        />
        <CardContent className="flex flex-wrap items-center gap-4 py-4 sm:flex-nowrap">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl",
              chip,
            )}
          >
            <AlarmClock className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
              {expired ? "0:00" : fmt(remaining)}
            </p>
          </div>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="w-full shrink-0 sm:w-auto"
            onClick={reset}
          >
            Reset to 15:00
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
