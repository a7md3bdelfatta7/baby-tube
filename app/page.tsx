"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listVideos } from "@/lib/api";
import { extractVideoId, thumbnailFor } from "@/lib/youtube";

export default function HomePage() {
  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });

  return (
    <main className="max-w-6xl mx-auto px-4 pt-6">
      <header className="text-center mb-8">
        <div className="inline-block bg-white/70 backdrop-blur rounded-full px-6 py-2 shadow border-4 border-pink-200 animate-bounce-slow">
          <span className="text-2xl">🎈🌈🎵</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-pink-500 drop-shadow-sm mt-3">
          Welcome to Baby Tube!
        </h1>
        <p className="text-lg text-purple-500 mt-2">Tap a video to play 💖</p>
        <Link
          href="/admin"
          className="inline-block mt-4 text-xs text-pink-400 hover:text-pink-600 underline"
        >
          admin
        </Link>
      </header>

      {isLoading && (
        <div className="text-center text-purple-500 text-xl">Loading… 🎀</div>
      )}

      {videos && videos.length === 0 && (
        <div className="text-center text-purple-500 text-xl bg-white/70 rounded-3xl p-10 border-4 border-pink-200">
          No videos yet. Ask an adult to add some! 🎬
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
        {videos?.map((v) => {
          const ytId = extractVideoId(v.videoUrl);
          const thumb = v.thumbnailUrl ?? (ytId ? thumbnailFor(ytId) : null);
          return (
            <Link
              key={v.id}
              href={`/watch/${v.id}`}
              className="group bg-white rounded-3xl overflow-hidden shadow-lg border-4 border-white hover:border-pink-300 hover:-translate-y-1 transition-transform animate-pop"
            >
              <div className="aspect-video bg-pink-100 overflow-hidden">
                {thumb ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={thumb}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-3xl">
                    🎬
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="font-bold text-purple-700 line-clamp-2 text-sm md:text-base">
                  {v.title}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
