import type { ReactElement } from "react";
import Link from "next/link";
import {
  BookOpen,
  Droplets,
  Home,
  Moon,
  Sparkles,
  StretchHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BreakIdea = {
  title: string;
  description: string;
  Icon: typeof Sparkles;
  accent: string;
};

const BREAK_IDEAS: BreakIdea[] = [
  {
    title: "Stretch together",
    description: "Reach up high, touch toes, and wiggle shoulders.",
    Icon: StretchHorizontal,
    accent: "var(--tots-mint)",
  },
  {
    title: "Sip some water",
    description: "Take a small drink and rest your eyes.",
    Icon: Droplets,
    accent: "var(--tots-sky)",
  },
  {
    title: "Read a book",
    description: "Pick a cozy story for a quiet moment.",
    Icon: BookOpen,
    accent: "var(--tots-sunshine)",
  },
  {
    title: "Bedtime calm",
    description: "Dim the lights and get ready for sleep.",
    Icon: Moon,
    accent: "var(--tots-lavender)",
  },
];

export function BreakModeScreen(): ReactElement {
  return (
    <section
      aria-labelledby="break-mode-heading"
      className="relative grid min-h-[36rem] overflow-hidden rounded-[1.4rem] border-2 border-white/70 bg-[color:var(--tots-cream)] px-4 py-6 text-center shadow-inner sm:px-8 md:aspect-video md:min-h-0"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, var(--tots-mint), transparent 28%), radial-gradient(circle at 85% 15%, var(--tots-peach), transparent 26%), radial-gradient(circle at 50% 100%, var(--tots-sky), transparent 32%)",
        }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col justify-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--tots-ink)] shadow-sm ring-1 ring-black/[0.04] backdrop-blur">
          <Sparkles className="size-4 text-[color:var(--primary)]" aria-hidden />
          Break mode
        </div>

        <span className="text-5xl leading-none animate-float-slow sm:text-6xl" aria-hidden>
          🌙
        </span>
        <h2
          id="break-mode-heading"
          className="mt-3 text-balance font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Time for a gentle break
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-muted-foreground sm:text-base">
          Screen time is done for now. Choose one calm idea with a grown-up before
          coming back later.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BREAK_IDEAS.map((idea) => {
            const { Icon } = idea;

            return (
              <div
                key={idea.title}
                className="rounded-[1.35rem] bg-white/82 p-3 text-left shadow-sm ring-1 ring-black/[0.04] backdrop-blur"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="grid size-11 shrink-0 place-items-center rounded-2xl shadow-inner ring-1 ring-black/[0.04]"
                    style={{ background: idea.accent }}
                  >
                    <Icon className="size-5 text-[color:var(--tots-ink)]" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      {idea.title}
                    </h3>
                    <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                      {idea.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href="/"
          className={cn(
            "mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[color:var(--tots-ink)] px-5 py-3 text-sm font-semibold text-[color:var(--tots-cream)] shadow-lg shadow-[color:var(--tots-ink)]/25 transition",
            "hover:-translate-y-0.5 hover:brightness-110",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40 focus-visible:ring-offset-2",
          )}
        >
          <Home className="size-4" aria-hidden />
          Back home
        </Link>
      </div>
    </section>
  );
}
