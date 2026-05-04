"use client";

import { useEffect, useState } from "react";
import { useWatchTimer } from "@/lib/timer-store";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.max(0, Math.floor(s % 60));
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function WatchTimerBar() {
  const { remaining, expired, reset } = useWatchTimer();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  let color = "bg-green-400";
  let label = "Plenty of time! 🎈";
  if (expired) {
    color = "bg-red-500 animate-pulse";
    label = "Time's up! 💤";
  } else if (remaining <= 120) {
    color = "bg-orange-400";
    label = "Almost done…";
  } else if (remaining <= 300) {
    color = "bg-amber-300";
    label = "Wrapping up soon";
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-3">
      <div
        className={`mx-auto max-w-3xl rounded-2xl shadow-lg border-4 border-white/70 ${color} text-white px-4 py-3 flex items-center gap-3`}
      >
        <span className="text-2xl">⏰</span>
        <div className="flex-1">
          <div className="text-sm opacity-90">{label}</div>
          <div className="text-2xl font-bold tabular-nums">
            {expired ? "0:00" : fmt(remaining)}
          </div>
        </div>
        <button
          onClick={reset}
          className="bg-white/90 text-pink-600 font-bold rounded-xl px-3 py-2 hover:bg-white"
        >
          Reset 15:00
        </button>
      </div>
    </div>
  );
}
