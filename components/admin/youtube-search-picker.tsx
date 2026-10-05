"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchYoutubeVideos } from "@/lib/api";
import type { YTSearchResult } from "@/lib/youtube";
import { cn } from "@/lib/utils";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 400;

export function YoutubeSearchPicker({
  onSelect,
}: {
  onSelect: (result: YTSearchResult) => void;
}): ReactElement {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YTSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      searchYoutubeVideos(trimmed)
        .then((data) => {
          if (requestId.current !== currentRequest) return;
          setResults(data);
        })
        .catch((e: unknown) => {
          if (requestId.current !== currentRequest) return;
          setError(e instanceof Error ? e.message : "Search failed");
          setResults([]);
        })
        .finally(() => {
          if (requestId.current !== currentRequest) return;
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const showDropdown =
    open &&
    query.trim().length >= MIN_QUERY_LENGTH &&
    (loading || error || results.length > 0);

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Search YouTube to pick a video…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {loading && (
          <Loader2
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}
      </div>
      {showDropdown && (
        <div className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border bg-popover shadow-md">
          {error && (
            <p className="p-3 text-sm text-destructive">{error}</p>
          )}
          {!error && results.length === 0 && !loading && (
            <p className="p-3 text-sm text-muted-foreground">No results</p>
          )}
          {!error &&
            results.map((result) => (
              <button
                key={result.videoId}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 p-2 text-left hover:bg-accent",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(result);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
              >
                {result.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.thumbnailUrl}
                    alt=""
                    className="h-12 w-20 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {result.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {result.channelTitle}
                  </p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
