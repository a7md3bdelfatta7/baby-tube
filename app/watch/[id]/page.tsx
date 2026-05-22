"use client";

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo } from "react";
import { ArrowLeft, SkipForward } from "lucide-react";
import { Player } from "@/components/Player";
import { listVideos } from "@/lib/api";
import { useWatchTimer } from "@/lib/timer-store";
import { extractVideoId, thumbnailFor } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): ReactElement {
  const { id } = use(params);
  const router = useRouter();
  const { expired } = useWatchTimer();

  const { data: videos } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });

  const { current, next, prev, isLast } = useMemo(() => {
    if (!videos) {
      return { current: null, next: null, prev: null, isLast: false };
    }
    const idx = videos.findIndex((v) => String(v.id) === String(id));
    return {
      current: idx >= 0 ? videos[idx] : null,
      next: idx >= 0 && idx < videos.length - 1 ? videos[idx + 1] : null,
      prev: idx > 0 ? videos[idx - 1] : null,
      isLast: idx === videos.length - 1,
    };
  }, [videos, id]);

  const goNext = (): void => {
    if (next) router.push(`/watch/${next.id}`);
    else router.push("/");
  };

  if (!videos) {
    return (
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 md:pt-10">
        <div className="space-y-5">
          <Skeleton className="h-11 w-44 rounded-xl" />
          <Skeleton className="aspect-video w-full rounded-2xl shadow-inner" />
          <Skeleton className="h-9 w-2/3 rounded-lg" />
        </div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-center md:pt-10">
        <Card className="mx-auto max-w-md rounded-2xl border-border/80 shadow-xl shadow-black/[0.06]">
          <CardHeader>
            <CardTitle>Video not found</CardTitle>
            <CardDescription>
              This video may have been removed from the list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/" />} variant="default" size="lg">
              Back home
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-6 md:pt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/70 px-3 py-2 shadow-sm backdrop-blur-md md:px-4">
        <Button render={<Link href="/" />} variant="outline" size="default">
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Home
        </Button>
        <Button type="button" onClick={goNext} size="default">
          Skip
          <SkipForward className="size-4" data-icon="inline-end" />
        </Button>
      </div>

      <div className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-card/40 p-2 shadow-[0_32px_64px_-16px_oklch(0.25_0.08_290/0.25)] ring-1 ring-black/[0.04] backdrop-blur-[2px] md:p-3">
        {expired ? (
          <Card className="aspect-video place-content-center rounded-2xl border-dashed border-primary/30 bg-muted/40 shadow-none">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="text-6xl leading-none" aria-hidden>
                💤
              </span>
              <CardTitle className="text-2xl font-semibold">Time&apos;s up</CardTitle>
              <CardDescription className="max-w-xs text-base">
                Time for a break. Come back later for more shows.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <Player
            key={current.id}
            videoUrl={current.videoUrl}
            startSeconds={current.startSeconds}
            endSeconds={current.endSeconds}
            onEnded={goNext}
          />
        )}
      </div>

      <div className="mt-8 space-y-3">
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {current.title}
        </h2>
        <Separator className="bg-border/80" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {next && <UpNextCard label="Up next" video={next} />}
        {!next && isLast && prev && (
          <UpNextCard label="Watch again" video={prev} />
        )}
      </div>
    </main>
  );
}

function UpNextCard({
  label,
  video,
}: {
  label: string;
  video: {
    id: number;
    title: string;
    videoUrl: string;
    thumbnailUrl: string | null;
  };
}): ReactElement {
  const ytId = extractVideoId(video.videoUrl);
  const thumb = video.thumbnailUrl ?? (ytId ? thumbnailFor(ytId) : null);
  return (
    <Link href={`/watch/${video.id}`} className="block rounded-2xl outline-none">
      <Card className="gap-0 overflow-hidden rounded-2xl border-border/70 py-0 shadow-md transition-all hover:border-primary/35 hover:shadow-lg">
        <CardContent className="flex gap-4 p-4">
          <div className="relative h-[5.25rem] w-[8.5rem] shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-black/[0.06]">
            {thumb ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={thumb}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-primary">
              {label}
            </p>
            <p className="mt-1 line-clamp-2 font-semibold leading-snug text-foreground">
              {video.title}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
