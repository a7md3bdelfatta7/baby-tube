import type { ReactElement } from "react";

export function TheaterModeIcon({
  className,
}: {
  className?: string;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <polyline points="10.5 9 7 12 10.5 15" />
      <polyline points="13.5 9 17 12 13.5 15" />
    </svg>
  );
}
