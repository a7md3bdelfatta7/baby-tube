export type YTPlaylistItem = {
  title: string;
  description: string;
  videoId: string;
  thumbnailUrl: string | null;
};

export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function extractPlaylistId(url: string): string | null {
  const m = url.match(/[?&]list=([\w-]+)/);
  return m ? m[1] : null;
}

export function thumbnailFor(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export async function fetchPlaylistItems(
  playlistId: string,
  apiKey: string,
): Promise<YTPlaylistItem[]> {
  const items: YTPlaylistItem[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube API error ${res.status}: ${text}`);
    }
    const data = await res.json();

    for (const it of data.items ?? []) {
      const videoId = it.contentDetails?.videoId;
      const snippet = it.snippet;
      if (!videoId || !snippet) continue;
      // Skip private/deleted
      if (
        snippet.title === "Private video" ||
        snippet.title === "Deleted video"
      ) {
        continue;
      }
      const thumb =
        snippet.thumbnails?.high?.url ??
        snippet.thumbnails?.medium?.url ??
        snippet.thumbnails?.default?.url ??
        thumbnailFor(videoId);
      items.push({
        title: snippet.title,
        description: snippet.description ?? "",
        videoId,
        thumbnailUrl: thumb,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}
