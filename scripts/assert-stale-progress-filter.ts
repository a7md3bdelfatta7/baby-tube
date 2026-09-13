/**
 * Pure-logic assertion: stale-progress filter (FR-36). Given a profile-input's incoming
 * videoProgress array with one videoId absent from a fixture catalog Set, assert the
 * filtered result omits only that entry and keeps the rest. No DB required.
 * Run: pnpm exec tsx scripts/assert-stale-progress-filter.ts
 */
import { filterKnownVideoProgress } from "@/lib/child-profiles-server";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${message}`);
}

const knownVideoIds = new Set([1, 2, 3]);

const incoming = [
  { videoId: 1, positionSeconds: 10, totalSeconds: 600, updatedAt: "2026-01-01T00:00:00.000Z" },
  { videoId: 999, positionSeconds: 20, totalSeconds: 700, updatedAt: "2026-01-01T00:00:00.000Z" }, // stale/deleted video
  { videoId: 3, positionSeconds: 30, totalSeconds: 800, updatedAt: "2026-01-01T00:00:00.000Z" },
  { videoId: 1, positionSeconds: 40, totalSeconds: 900, updatedAt: "2026-01-02T00:00:00.000Z" },
];

const filtered = filterKnownVideoProgress(incoming, knownVideoIds);

assert(filtered.length === 2, "stale and duplicate entries are omitted");
assert(
  filtered.every((entry) => entry.videoId !== 999),
  "the stale videoId (999) is absent from the result",
);
assert(
  filtered.some((entry) => entry.videoId === 1) &&
    filtered.some((entry) => entry.videoId === 3),
  "known videoIds (1, 3) are both kept",
);
assert(
  filtered.find((entry) => entry.videoId === 1)?.positionSeconds === 10,
  "the first duplicate videoId is kept deterministically",
);

const emptyResult = filterKnownVideoProgress(incoming, new Set());
assert(emptyResult.length === 0, "empty known-set drops everything without throwing");

if (process.exitCode === 1) {
  console.error("assert-stale-progress-filter: FAILED");
} else {
  console.log("assert-stale-progress-filter: all assertions passed");
}
