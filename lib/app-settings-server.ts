import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, type AppSettings } from "@/db/schema";

const SETTINGS_ID = 1;

export async function getOrCreateSettings(): Promise<AppSettings> {
  const [existing] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID));

  if (existing) return existing;

  const [created] = await db
    .insert(appSettings)
    .values({ id: SETTINGS_ID })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID));

  if (!row) throw new Error("Unable to load settings");

  return row;
}

export async function appendVideoIdsToQueue(
  videoIds: readonly number[],
): Promise<number[]> {
  if (videoIds.length === 0) return [];

  const settings = await getOrCreateSettings();
  const existing = new Set(settings.queueVideoIds);
  const nextIds = [...settings.queueVideoIds];

  for (const id of videoIds) {
    if (!existing.has(id)) {
      existing.add(id);
      nextIds.push(id);
    }
  }

  if (nextIds.length === settings.queueVideoIds.length) {
    return settings.queueVideoIds;
  }

  const [updated] = await db
    .insert(appSettings)
    .values({ id: SETTINGS_ID, queueVideoIds: nextIds })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { queueVideoIds: nextIds },
    })
    .returning();

  return updated.queueVideoIds;
}
