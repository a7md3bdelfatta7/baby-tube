import type { ReactElement } from "react";

/**
 * Dreamy Tots backdrop: pastel orbs, floating clouds, twinkling stars.
 * Purely visual, fixed below content (z -10), aria-hidden.
 */
export function AppBackdrop(): ReactElement {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      {/* soft pastel orbs — Tots palette */}
      <div className="absolute -left-[18%] top-[-22%] size-[min(120vw,720px)] rounded-full bg-[color:var(--tots-mint)] opacity-70 blur-[120px]" />
      <div className="absolute right-[-15%] top-[10%] size-[min(90vw,560px)] rounded-full bg-[color:var(--tots-lavender)] opacity-65 blur-[110px]" />
      <div className="absolute bottom-[-10%] left-[20%] size-[min(80vw,520px)] rounded-full bg-[color:var(--tots-peach)] opacity-65 blur-[110px]" />
      <div className="absolute bottom-[10%] right-[10%] size-[min(60vw,380px)] rounded-full bg-[color:var(--tots-sky)] opacity-60 blur-[100px]" />

      {/* floating clouds */}
      <Cloud className="absolute left-[6%] top-[12%] w-28 text-white/90 animate-float-slow md:w-36" />
      <Cloud className="absolute right-[8%] top-[26%] w-24 text-white/85 animate-float-slower md:w-32" />
      <Cloud className="absolute left-[40%] top-[64%] w-20 text-white/75 animate-float-slow md:w-28" />
      <Cloud className="absolute right-[18%] bottom-[8%] w-32 text-white/85 animate-float-slower md:w-40" />

      {/* twinkling stars (Tots sunshine + cheek) */}
      <Star className="absolute left-[18%] top-[8%] size-3 text-[color:var(--tots-sunshine)] animate-twinkle" />
      <Star className="absolute right-[24%] top-[6%] size-2.5 text-[color:var(--tots-cheek)] animate-twinkle [animation-delay:0.6s]" />
      <Star className="absolute left-[60%] top-[20%] size-2 text-[color:var(--tots-sunshine)] animate-twinkle [animation-delay:1.1s]" />
      <Star className="absolute left-[10%] top-[44%] size-2.5 text-[color:var(--tots-cheek)] animate-twinkle [animation-delay:0.3s]" />
      <Star className="absolute right-[12%] top-[50%] size-3 text-[color:var(--tots-sunshine)] animate-twinkle [animation-delay:1.4s]" />
      <Star className="absolute left-[30%] bottom-[18%] size-2 text-[color:var(--tots-cheek)] animate-twinkle [animation-delay:0.9s]" />

      {/* gentle vertical wash */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.32)_45%,transparent_100%)]" />
    </div>
  );
}

function Cloud({ className }: { className?: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 64 36"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M14 28a10 10 0 010-20 12 12 0 0123-3 9 9 0 0113 12 8 8 0 01-7 11H14z" />
    </svg>
  );
}

function Star({ className }: { className?: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
    </svg>
  );
}
