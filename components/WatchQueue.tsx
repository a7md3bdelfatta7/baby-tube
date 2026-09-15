"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import type { Video } from "@/db/schema";
import { PASTELS } from "@/lib/theme";
import { extractVideoId, thumbnailFor } from "@/lib/youtube";
import { cn } from "@/lib/utils";

type WatchQueueProps = {
  playlist: Video[];
  currentVideoId: number;
  useSessionQueue: boolean;
  sticky: boolean;
};

export function WatchQueue({
  playlist,
  currentVideoId,
  useSessionQueue,
  sticky,
}: WatchQueueProps): ReactElement {
  return (
    <aside
      className={cn(
        "min-w-0",
        sticky && "lg:sticky lg:top-20",
      )}
    >
      <div className="space-y-2">
        {playlist.map((video, idx) => (
          <QueueRow
            key={video.id}
            video={video}
            isActive={video.id === currentVideoId}
            accent={PASTELS[idx % PASTELS.length]}
            preserveSessionQueue={useSessionQueue}
          />
        ))}
      </div>
    </aside>
  );
}

function QueueRow({
  video,
  isActive,
  accent,
  preserveSessionQueue,
}: {
  video: {
    id: number;
    title: string;
    videoUrl: string;
    thumbnailUrl: string | null;
  };
  isActive: boolean;
  accent: string;
  preserveSessionQueue: boolean;
}): ReactElement {
  const ytId = extractVideoId(video.videoUrl);
  const thumb = video.thumbnailUrl ?? (ytId ? thumbnailFor(ytId) : null);
  const href = `/watch/${video.id}${preserveSessionQueue ? "?queue=session" : ""}`;
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-2xl p-2 outline-none transition-colors",
        "focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/40",
        isActive
          ? "bg-[color:var(--tots-mint)]/50 ring-1 ring-[color:var(--tots-mint)]"
          : "hover:bg-black/[0.03]",
      )}
    >
      <div
        className="relative h-[3.6rem] w-[6rem] shrink-0 overflow-hidden rounded-xl ring-1 ring-black/[0.05]"
        style={{
          background: `linear-gradient(135deg, ${accent}, color-mix(in oklch, ${accent} 50%, white))`,
        }}
      >
        {thumb ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <p
        className={cn(
          "min-w-0 flex-1 line-clamp-2 text-sm leading-snug",
          isActive ? "font-semibold text-foreground" : "text-foreground/80",
        )}
      >
        {video.title}
      </p>
      {isActive ? (
        <span className="shrink-0 rounded-full bg-[color:var(--tots-ink)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[color:var(--tots-cream)]">
          Now
        </span>
      ) : null}
    </Link>
  );
}
