/**
 * Pure-logic assertion: cap-eviction ordering. Builds >50 synthetic video_progress rows
 * with distinct `updatedAt` timestamps and asserts `selectCapKeepIds` keeps exactly the
 * 50 most-recently-updated rows, using id DESC as the deterministic tie-breaker.
 * Run: pnpm exec tsx scripts/assert-progress-cap-order.ts
 */
import { selectCapKeepIds } from "@/lib/video-progress-server";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${message}`);
}

const CAP = 50;
const TOTAL_ROWS = 65;
const baseTime = Date.parse("2026-01-01T00:00:00.000Z");

const rows = Array.from({ length: TOTAL_ROWS }, (_, i) => ({
  id: i + 1,
  updatedAt: new Date(baseTime + i),
})).reverse();

const keepIds = selectCapKeepIds(rows, CAP);

assert(keepIds.size === CAP, `keeps exactly ${CAP} rows (got ${keepIds.size})`);

const expectedKeptIds = new Set(
  Array.from({ length: CAP }, (_, i) => TOTAL_ROWS - i),
);

assert(
  keepIds.size === expectedKeptIds.size &&
    [...keepIds].every((id) => expectedKeptIds.has(id)),
  "kept ids are exactly the most-recently-updated 50 (highest ids)",
);

const droppedIds = Array.from({ length: TOTAL_ROWS - CAP }, (_, i) => i + 1);
assert(
  droppedIds.every((id) => !keepIds.has(id)),
  "the 15 oldest rows are not kept",
);

const smallSet = rows.slice(0, 10);
const smallKeep = selectCapKeepIds(smallSet, CAP);
assert(
  smallKeep.size === smallSet.length,
  "when row count <= cap, all rows are kept",
);

const tiedRows = [
  { id: 1, updatedAt: new Date(baseTime) },
  { id: 3, updatedAt: new Date(baseTime) },
  { id: 2, updatedAt: new Date(baseTime) },
];
const tiedKeep = selectCapKeepIds(tiedRows, 2);
assert(
  tiedKeep.has(3) && tiedKeep.has(2) && !tiedKeep.has(1),
  "equal timestamps use highest id as the deterministic tie-breaker",
);

if (process.exitCode === 1) {
  console.error("assert-progress-cap-order: FAILED");
} else {
  console.log("assert-progress-cap-order: all assertions passed");
}
