"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, Settings2 } from "lucide-react";
import { listVideos } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

/**
 * Fixed site header shown on every page (see app/layout.tsx), the way
 * YouTube's header stays put with the brand mark in the top-left corner.
 */
export function AppHeader(): ReactElement {
  const pathname = usePathname();
  const { data: videos } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });
  const hasSongs = useMemo(
    () => (videos ?? []).some((video) => video.categories.includes("Songs")),
    [videos],
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/60 bg-white/80 shadow-[0_10px_30px_-18px_rgba(80,90,160,0.35)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40"
          aria-label="Tots home"
        >
          <BrandLogo size="md" />
        </Link>

        <div className="flex items-center gap-2">
          {hasSongs && pathname !== "/listen" ? (
            <Link
              href="/listen"
              className={cn(
                "inline-flex items-center gap-2 rounded-full bg-[color:var(--tots-ink)] px-4 py-2 text-xs font-semibold text-[color:var(--tots-cream)] shadow-sm transition",
                "hover:-translate-y-0.5 hover:brightness-110",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40",
              )}
              aria-label="Enter listening mode"
            >
              <Headphones className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Listening mode</span>
              <span className="sm:hidden">Listen</span>
            </Link>
          ) : null}

          {pathname !== "/admin" ? (
            <Link
              href="/admin"
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold text-foreground shadow-sm ring-1 ring-black/[0.04] backdrop-blur transition",
                "hover:-translate-y-0.5 hover:bg-white",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40",
              )}
              aria-label="Open parents panel"
            >
              <Settings2 className="size-3.5 text-[color:var(--tots-ink)]" aria-hidden />
              <span className="hidden sm:inline">Parents panel</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
