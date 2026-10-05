import { NextRequest, NextResponse } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { searchVideos } from "@/lib/youtube";

const MIN_QUERY_LENGTH = 2;

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY not configured on server" },
      { status: 500 },
    );
  }

  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be at least ${MIN_QUERY_LENGTH} characters` },
      { status: 400 },
    );
  }

  try {
    const results = await searchVideos(query, apiKey);
    return NextResponse.json({ results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
