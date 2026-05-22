import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

const ICON = "/brand/tots-brand-kit/svg/tots-icon.svg";
const WORDMARK_HORIZONTAL = "/brand/tots-brand-kit/svg/tots-logo-horizontal.svg";
const WORDMARK_VERTICAL = "/brand/tots-brand-kit/svg/tots-logo-vertical.svg";

const ICON_DIMS = {
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
} as const;

const WORD_SIZE = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
} as const;

/**
 * Official Tots brand mark. Default renders icon + Quicksand wordmark.
 * Use `iconOnly` for tight spots, or `lockup="vertical"` for the official
 * stacked lockup (good for splash/auth screens).
 */
export function BrandLogo({
  className,
  size = "md",
  iconOnly = false,
  lockup = "inline",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  lockup?: "inline" | "vertical";
}): ReactElement {
  if (lockup === "vertical") {
    const w = size === "lg" ? 220 : size === "md" ? 180 : 140;
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={WORDMARK_VERTICAL}
        alt="Tots"
        width={w}
        height={Math.round(w * 1.15)}
        className={cn("h-auto", className)}
      />
    );
  }

  if (iconOnly) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={ICON}
        alt="Tots"
        className={cn(ICON_DIMS[size], "rounded-2xl", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ICON}
        alt=""
        className={cn(ICON_DIMS[size], "rounded-2xl drop-shadow-sm")}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-bold tracking-tight text-[color:var(--tots-ink)]",
            WORD_SIZE[size],
          )}
        >
          tots
        </span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          little stars
        </span>
      </span>
    </div>
  );
}

/** Pure-image official horizontal lockup. */
export function BrandLockupHorizontal({
  className,
  width = 220,
}: {
  className?: string;
  width?: number;
}): ReactElement {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={WORDMARK_HORIZONTAL}
      alt="Tots"
      width={width}
      height={Math.round(width * 0.32)}
      className={cn("h-auto", className)}
    />
  );
}
