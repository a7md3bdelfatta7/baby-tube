import type { ReactElement } from "react";
import Link from "next/link";
import { Settings2, ArrowLeft } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminPanel } from "@/components/AdminPanel";

export default function AdminPage(): ReactElement {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 md:pt-8">
      {/* Back to home */}
      <div className="mb-8 flex justify-end">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-black/[0.05] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <ArrowLeft className="size-4 text-[color:var(--tots-ink)]" />
          <span className="hidden sm:inline">Home</span>
        </Link>
      </div>

      <header className="relative mb-10 overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/65 px-6 py-8 text-center shadow-[0_24px_60px_-20px_rgba(61,61,92,0.18)] ring-1 ring-[color:var(--tots-ink)]/[0.04] backdrop-blur-xl md:py-10">
        <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-[color:var(--tots-lavender)] opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 size-40 rounded-full bg-[color:var(--tots-mint)] opacity-70 blur-3xl" />
        <div className="relative mx-auto flex max-w-xl flex-col items-center gap-3">
          <span className="relative flex size-16 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/tots-brand-kit/svg/tots-icon.svg"
              alt=""
              aria-hidden
              className="size-16 rounded-2xl shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-[color:var(--tots-ink)] text-[color:var(--tots-cream)] shadow-md ring-4 ring-white">
              <Settings2 className="size-3.5" aria-hidden />
            </span>
          </span>
          <h1 className="text-balance font-display text-3xl font-bold tracking-tight md:text-4xl">
            Parents&apos; playroom
          </h1>
          <p className="max-w-md text-sm text-muted-foreground md:text-base">
            Import playlists, edit clips, set screen time, and curate what
            appears on the Tots home screen.
          </p>
        </div>
      </header>
      <AdminGate>
        <AdminPanel />
      </AdminGate>
    </main>
  );
}
