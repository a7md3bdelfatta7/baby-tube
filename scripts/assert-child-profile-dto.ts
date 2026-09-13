/**
 * Pure-logic assertion: DTO assembly. Given fixture profile + video_progress rows (plain
 * objects shaped like the Drizzle row types, no DB required), assert `toChildProfile` /
 * `toVideoProgressEntry` produce the exact nested `ChildProfile` field names/types clients
 * expect (see db/schema.ts `ChildProfile`).
 * Run: pnpm exec tsx scripts/assert-child-profile-dto.ts
 */
import type { ChildProfileRow, VideoProgressRow } from "@/db/schema";
import { toChildProfile, toVideoProgressEntry } from "@/lib/child-profiles-server";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${message}`);
}

const profileRow: ChildProfileRow = {
  id: "profile-abc",
  name: "Test Kid",
  birthDate: "2020-01-01",
  screenTimeMinutes: 30,
  screenTimeResetHours: 24,
  preferredCategories: ["Songs", "NotAllowedAnymore"],
  watchHistory: [
    {
      videoId: 1,
      title: "Video One",
      watchedAt: "2026-01-01T00:00:00.000Z",
      status: "completed",
      watchedSeconds: 120,
    },
  ],
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const progressRow: VideoProgressRow = {
  id: 7,
  profileId: "profile-abc",
  videoId: 42,
  positionSeconds: 100,
  totalSeconds: 600,
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

const entry = toVideoProgressEntry(progressRow);

assert(entry.videoId === 42, "toVideoProgressEntry maps videoId");
assert(entry.positionSeconds === 100, "toVideoProgressEntry maps positionSeconds");
assert(entry.totalSeconds === 600, "toVideoProgressEntry maps totalSeconds");
assert(
  entry.updatedAt === "2026-01-02T00:00:00.000Z",
  "toVideoProgressEntry serializes updatedAt to ISO string",
);

const dto = toChildProfile(profileRow, [entry], ["Songs", "Learning"]);

assert(dto.id === "profile-abc", "ChildProfile.id maps from row.id");
assert(dto.name === "Test Kid", "ChildProfile.name maps from row.name");
assert(dto.birthDate === "2020-01-01", "ChildProfile.birthDate maps from row.birthDate");
assert(
  dto.screenTimeMinutes === 30 && dto.screenTimeResetHours === 24,
  "ChildProfile screen-time fields map through",
);
assert(
  Array.isArray(dto.watchHistory) && dto.watchHistory.length === 1,
  "ChildProfile.watchHistory passes through as-is (still JSON on the row)",
);
assert(
  Array.isArray(dto.videoProgress) &&
    dto.videoProgress.length === 1 &&
    dto.videoProgress[0].videoId === 42,
  "ChildProfile.videoProgress is the assembled per-profile progress list",
);
assert(
  dto.preferredCategories.length === 1 && dto.preferredCategories[0] === "Songs",
  "preferredCategories is normalized against `allowed` at read time (stale category dropped)",
);

if (process.exitCode === 1) {
  console.error("assert-child-profile-dto: FAILED");
} else {
  console.log("assert-child-profile-dto: all assertions passed");
}
