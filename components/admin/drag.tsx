"use client";

import type { ReactElement } from "react";
import type { Video } from "@/db/schema";
import { cn } from "@/lib/utils";

export type DropPosition = "before" | "after";

export type DropTarget = {
  id: number;
  position: DropPosition;
};

export function getDropPosition(
  event: React.DragEvent<HTMLElement>,
): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;

  return event.clientY < midpoint ? "before" : "after";
}

export function moveIdRelative(
  ids: readonly number[],
  movedId: number,
  targetId: number,
  position: DropPosition,
): number[] {
  if (movedId === targetId) return [...ids];

  const moved = ids.find((id) => id === movedId);
  if (moved === undefined) return [...ids];

  const withoutMoved = ids.filter((id) => id !== movedId);
  const targetIndex = withoutMoved.indexOf(targetId);
  if (targetIndex < 0) return [...ids];

  const insertIndex = position === "before" ? targetIndex : targetIndex + 1;

  return [
    ...withoutMoved.slice(0, insertIndex),
    moved,
    ...withoutMoved.slice(insertIndex),
  ];
}

export function moveVideoRelative(
  videos: readonly Video[],
  movedId: number,
  targetId: number,
  position: DropPosition,
): Video[] {
  const videoById = new Map(videos.map((video) => [video.id, video]));

  return moveIdRelative(
    videos.map((video) => video.id),
    movedId,
    targetId,
    position,
  )
    .map((id) => videoById.get(id))
    .filter((video): video is Video => video !== undefined);
}

export function DropIndicator({
  active,
  position,
  label,
}: {
  active: boolean;
  position: DropPosition;
  label: string;
}): ReactElement | null {
  if (!active) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-4 right-4 z-10 flex items-center gap-2",
        position === "before" ? "-top-3" : "-bottom-3",
      )}
      aria-hidden="true"
    >
      <span className="h-1 flex-1 rounded-full bg-[color:var(--tots-ink)] shadow-[0_0_0_4px_rgba(255,255,255,0.85)]" />
      <span className="rounded-full bg-[color:var(--tots-ink)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[color:var(--tots-cream)] shadow-lg">
        {label}
      </span>
      <span className="h-1 flex-1 rounded-full bg-[color:var(--tots-ink)] shadow-[0_0_0_4px_rgba(255,255,255,0.85)]" />
    </div>
  );
}

export function isLeavingContainer(
  event: React.DragEvent<HTMLElement>,
): boolean {
  const nextTarget = event.relatedTarget;

  return !(nextTarget instanceof Node && event.currentTarget.contains(nextTarget));
}
