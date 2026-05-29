"use client";

import type { ComponentProps, ReactElement, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ADMIN_CARD_CLASS =
  "rounded-[1.75rem] border-white/60 bg-white/85 shadow-[0_18px_45px_-20px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md";

export function AdminCard({
  className,
  ...props
}: ComponentProps<typeof Card>): ReactElement {
  return <Card className={cn(ADMIN_CARD_CLASS, className)} {...props} />;
}

export function CategoryBadges({
  categories,
}: {
  categories: readonly string[];
}): ReactElement {
  if (categories.length === 0) {
    return <span className="text-xs text-muted-foreground">Uncategorized</span>;
  }

  return (
    <>
      {categories.map((category) => (
        <Badge
          key={category}
          variant="secondary"
          className="rounded-full bg-white/80 px-2 py-0.5 text-[0.65rem]"
        >
          {category}
        </Badge>
      ))}
    </>
  );
}

export function DragStatus({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-transparent px-3 py-2 text-sm transition-colors",
        active
          ? "border-[color:var(--tots-ink)]/25 bg-[color:var(--tots-cream)]/70 text-[color:var(--tots-ink)]"
          : "bg-muted/30 text-muted-foreground",
      )}
      aria-live="polite"
    >
      {children}
    </div>
  );
}

export function fmtCategories(categories: readonly string[]): string {
  return categories.length ? categories.join(", ") : "Uncategorized";
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
