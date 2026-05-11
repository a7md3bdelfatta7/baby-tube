import type { ReactElement } from "react";

/**
 * Decorative mesh behind page content. Purely visual (fixed z-index below main UI).
 */
export function AppBackdrop(): ReactElement {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute -left-[20%] top-[-18%] size-[min(120vw,720px)] rounded-full bg-primary/25 blur-[120px]" />
      <div className="absolute right-[-15%] top-[15%] size-[min(90vw,560px)] rounded-full bg-secondary/80 blur-[100px]" />
      <div className="absolute bottom-[5%] left-[25%] size-[min(70vw,420px)] rounded-full bg-amber-200/35 blur-[90px]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,oklch(0.99_0.02_330/0.4)_40%,transparent_100%)]" />
    </div>
  );
}
