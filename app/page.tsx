"use client";

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Clapperboard, Play, Sparkles } from "lucide-react";
import { listVideos } from "@/lib/api";
import { extractVideoId, thumbnailFor } from "@/lib/youtube";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export default function HomePage(): ReactElement {
  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:pt-14">
      <header className="relative mb-14 overflow-hidden rounded-[2rem] border border-white/50 bg-card/75 px-6 py-10 shadow-[0_24px_80px_-12px_oklch(0.56_0.2_350/0.18)] ring-1 ring-black/[0.04] backdrop-blur-xl md:px-12 md:py-12">
        <div className="pointer-events-none absolute -right-16 -top-24 size-56 rounded-full bg-primary/20 blur-3xl md:size-72" />
        <div className="pointer-events-none absolute -bottom-20 left-10 size-48 rounded-full bg-secondary/60 blur-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="mb-5 flex justify-center">
            <Badge
              variant="secondary"
              className="gap-2 rounded-full border border-primary/15 bg-primary/10 px-5 py-2 text-sm font-medium text-primary shadow-sm"
            >
              <Sparkles className="size-4" aria-hidden />
              Baby Tube
            </Badge>
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Videos picked for{" "}
            <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
              cozy watching
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base text-muted-foreground md:text-lg">
            Tap any thumbnail — playback opens full screen on the next page.
          </p>
          <Link
            href="/admin"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-8 border-primary/25 bg-background/60 shadow-sm backdrop-blur-sm hover:bg-background/90",
            )}
          >
            Parent admin
          </Link>
        </div>
      </header>

      {isLoading && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card
              key={i}
              className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-lg shadow-black/[0.03]"
            >
              <Skeleton className="aspect-video w-full rounded-none rounded-t-2xl" />
              <CardContent className="space-y-2 px-4 pb-5 pt-5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && videos && videos.length === 0 && (
        <Alert className="mx-auto max-w-lg rounded-2xl border-dashed border-primary/25 bg-card/90 shadow-lg backdrop-blur-sm">
          <Clapperboard className="size-5 text-primary" />
          <AlertTitle>No videos yet</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Ask a grown-up to open Admin and import a playlist or add videos one
            by one.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && videos && videos.length > 0 ? (
        <section aria-labelledby="videos-heading">
          <div className="mb-6 flex items-end justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <h2
                id="videos-heading"
                className="text-lg font-semibold tracking-tight md:text-xl"
              >
                Library
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {videos.length} video{videos.length === 1 ? "" : "s"} ready to play
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 md:gap-6">
            {videos.map((v) => {
              const ytId = extractVideoId(v.videoUrl);
              const thumb =
                v.thumbnailUrl ?? (ytId ? thumbnailFor(ytId) : null);
              return (
                <Link
                  key={v.id}
                  href={`/watch/${v.id}`}
                  className={cn(
                    "group block rounded-2xl outline-none transition-all duration-300",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                    "hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10",
                  )}
                >
                  <Card className="h-full overflow-hidden rounded-2xl border-border/70 bg-card py-0 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.03] transition-[border-color,box-shadow] duration-300 group-hover:border-primary/35">
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      {thumb ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={thumb}
                          alt={v.title}
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                        />
                      ) : (
                        <div className="grid h-full place-items-center bg-muted">
                          <Play className="size-12 text-muted-foreground/50" />
                        </div>
                      )}
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-95"
                        aria-hidden
                      />
                      <div className="absolute inset-0 grid place-items-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                        <span className="flex size-14 items-center justify-center rounded-full bg-white text-primary shadow-xl ring-4 ring-white/30">
                          <Play className="size-7 fill-current pl-1" aria-hidden />
                        </span>
                      </div>
                    </div>
                    <CardContent className="px-4 pb-5 pt-5">
                      <CardTitle className="line-clamp-2 text-left text-[0.95rem] font-semibold leading-snug tracking-tight text-card-foreground md:text-base">
                        {v.title}
                      </CardTitle>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
