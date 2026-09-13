/**
 * Pure-logic assertion: `isTrackableVideo` 5-minute boundary. No DB required.
 * Run: pnpm exec tsx scripts/assert-trackable-video.ts
 */
import { isTrackableVideo, MIN_TRACKING_DURATION_SECONDS } from "@/lib/video-progress";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${message}`);
}

assert(
  MIN_TRACKING_DURATION_SECONDS === 5 * 60,
  "MIN_TRACKING_DURATION_SECONDS is 5 minutes",
);
assert(
  isTrackableVideo(5 * 60) === false,
  "exactly 5 minutes (300s) is NOT trackable (boundary is exclusive)",
);
assert(
  isTrackableVideo(5 * 60 - 1) === false,
  "under 5 minutes is not trackable",
);
assert(
  isTrackableVideo(5 * 60 + 1) === true,
  "just over 5 minutes is trackable",
);
assert(isTrackableVideo(0) === false, "0 seconds is not trackable");

if (process.exitCode === 1) {
  console.error("assert-trackable-video: FAILED");
} else {
  console.log("assert-trackable-video: all assertions passed");
}
