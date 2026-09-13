/**
 * Opt-in integration script (tsx). Uses a dedicated test URL plus an explicit write
 * confirmation so an ambient production DATABASE_URL can never activate it.
 * If set, exercises `upsertVideoProgress` against a REAL Postgres for the concurrency
 * behaviors that a pure-logic script cannot verify:
 *   (a) same (profileId, videoId) pair written concurrently -> exactly one row, last write wins
 *   (b) different videoIds under one profile, concurrent -> both rows survive
 *   (c) burst-write cap-50 -> row count converges to <= 50 after the final write
 *
 * Creates and cleans up its own temporary profile + video fixtures; does not touch existing
 * data. Manual/local verification only -- NOT part of the required
 * `pnpm run lint && pnpm run build` gate (no DATABASE_URL guaranteed in CI/sandbox).
 *
 * DO NOT run this against production. DO NOT use it to apply migrations.
 * Run:
 * VIDEO_PROGRESS_TEST_DATABASE_URL=postgres://... \
 * VIDEO_PROGRESS_TEST_CONFIRM=write-fixtures \
 * pnpm exec tsx scripts/verify-video-progress-db.ts
 */
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { childProfiles, videos } from "@/db/schema";
import { getVideoProgress, upsertVideoProgress } from "@/lib/video-progress-server";

async function main(): Promise<void> {
  const testDatabaseUrl = process.env.VIDEO_PROGRESS_TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    console.log(
      "verify-video-progress-db: SKIPPED (VIDEO_PROGRESS_TEST_DATABASE_URL is not set).",
    );
    return;
  }

  if (
    process.env.NODE_ENV === "production" ||
    process.env.VIDEO_PROGRESS_TEST_CONFIRM !== "write-fixtures"
  ) {
    throw new Error(
      "Refusing database writes: set VIDEO_PROGRESS_TEST_CONFIRM=write-fixtures outside production.",
    );
  }

  const parsedUrl = new URL(testDatabaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error("VIDEO_PROGRESS_TEST_DATABASE_URL must be a Postgres URL.");
  }

  process.env.DATABASE_URL = testDatabaseUrl;

  const profileId = `verify-progress-${randomUUID()}`;
  let failures = 0;
  const createdVideoIds: number[] = [];
  let profileCreated = false;

  try {
    const [videoA] = await db
      .insert(videos)
      .values({
        title: "verify-progress fixture A",
        videoUrl: "https://example.com/a",
      })
      .returning();
    createdVideoIds.push(videoA.id);

    const [videoB] = await db
      .insert(videos)
      .values({
        title: "verify-progress fixture B",
        videoUrl: "https://example.com/b",
      })
      .returning();
    createdVideoIds.push(videoB.id);

    const burstVideos = await db
      .insert(videos)
      .values(
        Array.from({ length: 60 }, (_, index) => ({
          title: `verify-progress burst fixture ${index}`,
          videoUrl: `https://example.com/burst-${index}`,
        })),
      )
      .returning();
    createdVideoIds.push(...burstVideos.map((video) => video.id));

    await db.insert(childProfiles).values({
      id: profileId,
      name: "verify-progress fixture",
      screenTimeMinutes: 15,
    });
    profileCreated = true;

    await Promise.all([
      upsertVideoProgress(profileId, videoA.id, 10, 700),
      upsertVideoProgress(profileId, videoA.id, 20, 700),
    ]);
    await upsertVideoProgress(profileId, videoA.id, 30, 700);
    const samePairRows = (await getVideoProgress(profileId)).filter(
      (entry) => entry.videoId === videoA.id,
    );
    if (samePairRows.length === 1 && samePairRows[0].positionSeconds === 30) {
      console.log(
        "PASS: same-pair writes collapse to one row and the latest write wins",
      );
    } else {
      failures += 1;
      console.error("FAIL: same-pair row count or latest payload is incorrect");
    }

    await Promise.all([
      upsertVideoProgress(profileId, videoA.id, 40, 700),
      upsertVideoProgress(profileId, videoB.id, 50, 700),
    ]);
    const afterDifferentPairs = await getVideoProgress(profileId);
    const hasBoth =
      afterDifferentPairs.some((entry) => entry.videoId === videoA.id) &&
      afterDifferentPairs.some((entry) => entry.videoId === videoB.id);
    if (hasBoth) {
      console.log("PASS: concurrent writes to different videoIds under one profile both survive");
    } else {
      failures += 1;
      console.error("FAIL: one of the two videoId rows is missing");
    }

    await Promise.all(
      burstVideos.map((video, index) =>
        upsertVideoProgress(profileId, video.id, index, 700),
      ),
    );
    await upsertVideoProgress(profileId, videoA.id, 60, 700);
    const afterBurst = await getVideoProgress(profileId);
    if (afterBurst.length <= 50) {
      console.log(`PASS: cap-50 converges after burst writes (row count: ${afterBurst.length})`);
    } else {
      failures += 1;
      console.error(`FAIL: expected <= 50 rows after burst, got ${afterBurst.length}`);
    }
  } finally {
    if (profileCreated) {
      await db.delete(childProfiles).where(eq(childProfiles.id, profileId));
    }
    if (createdVideoIds.length > 0) {
      await db
        .delete(videos)
        .where(inArray(videos.id, createdVideoIds));
    }
  }

  if (failures > 0) {
    console.error(`verify-video-progress-db: ${failures} assertion(s) failed`);
    process.exitCode = 1;
    return;
  }

  console.log("verify-video-progress-db: all assertions passed");
}

main().catch((error) => {
  console.error("verify-video-progress-db: ERROR", error);
  process.exitCode = 1;
});
