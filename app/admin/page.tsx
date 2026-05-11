import type { ReactElement } from "react";
import { Settings2 } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminPanel } from "@/components/AdminPanel";

export default function AdminPage(): ReactElement {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-10 md:pt-12">
      <header className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/45 bg-card/80 px-6 py-8 text-center shadow-xl shadow-black/[0.06] ring-1 ring-black/[0.04] backdrop-blur-xl md:py-10">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative mx-auto flex max-w-xl flex-col items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner ring-1 ring-primary/15">
            <Settings2 className="size-6" aria-hidden />
          </span>
          <h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            Library settings
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Import playlists, edit clips, and curate what appears on the home
            screen.
          </p>
        </div>
      </header>
      <AdminGate>
        <AdminPanel />
      </AdminGate>
    </main>
  );
}
