"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo } from "react";
import { Player } from "@/components/Player";
import { listVideos } from "@/lib/api";
import { useWatchTimer } from "@/lib/timer-store";
import { extractVideoId, thumbnailFor } from "@/lib/youtube";

export default function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { expired } = useWatchTimer();

  const { data: videos } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });

  const { current, next, prev, isLast } = useMemo(() => {
    if (!videos) return { current: null, next: null, prev: null, isLast: false };
    const idx = videos.findIndex((v) => String(v.id) === String(id));
    return {
      current: idx >= 0 ? videos[idx] : null,
      next: idx >= 0 && idx < videos.length - 1 ? videos[idx + 1] : null,
      prev: idx > 0 ? videos[idx - 1] : null,
      isLast: idx === videos.length - 1,
    };
  }, [videos, id]);

  const goNext = () => {
    if (next) router.push(`/watch/${next.id}`);
    else router.push("/");
  };

  if (!videos) {
    return (
      <main className="max-w-4xl mx-auto px-4 pt-6 text-center text-purple-500 text-xl">
        Loading… 🎀
      </main>
    );
  }
  if (!current) {
    return (
      <main className="max-w-4xl mx-auto px-4 pt-6 text-center">
        <p className="text-purple-500 text-xl">Video not found 😿</p>
        <Link href="/" className="text-pink-500 underline">
          Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <Link
          href="/"
          className="bg-white/80 hover:bg-white rounded-full px-4 py-2 font-bold text-pink-600 border-2 border-pink-200 shadow"
        >
          ← Home
        </Link>
        <button
          onClick={goNext}
          className="bg-purple-500 hover:bg-purple-600 text-white rounded-full px-4 py-2 font-bold shadow"
        >
          Skip ⏭
        </button>
      </div>

      {expired ? (
        <div className="aspect-video rounded-3xl bg-white/80 grid place-items-center text-center p-6 border-4 border-pink-200">
          <div>
            <div className="text-6xl mb-2">💤</div>
            <div className="text-2xl font-bold text-pink-600">Time&apos;s up!</div>
            <p className="text-purple-500 mt-1">
              Hit the Reset button below for more videos.
            </p>
          </div>
        </div>
      ) : (
        <Player
          key={current.id}
          videoUrl={current.videoUrl}
          startSeconds={current.startSeconds}
          endSeconds={current.endSeconds}
          onEnded={goNext}
        />
      )}

      <h2 className="text-2xl font-extrabold text-purple-700 mt-4">
        {current.title}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {next && <UpNextCard label="Up Next" video={next} />}
        {!next && isLast && prev && (
          <UpNextCard label="Try this one again" video={prev} />
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
  video: { id: number; title: string; videoUrl: string; thumbnailUrl: string | null };
}) {
  const ytId = extractVideoId(video.videoUrl);
  const thumb = video.thumbnailUrl ?? (ytId ? thumbnailFor(ytId) : null);
  return (
    <Link
      href={`/watch/${video.id}`}
      className="flex gap-3 bg-white rounded-2xl shadow border-4 border-white hover:border-pink-300 p-2"
    >
      <div className="w-32 h-20 bg-pink-100 rounded-xl overflow-hidden flex-shrink-0">
        {thumb && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={thumb} alt={video.title} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-pink-500 font-bold">{label}</div>
        <div className="font-bold text-purple-700 line-clamp-2 text-sm">
          {video.title}
        </div>
      </div>
    </Link>
  );
}
