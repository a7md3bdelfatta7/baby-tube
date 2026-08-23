import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, videos, type AppSettings } from "@/db/schema";
import {
  DEFAULT_CONTENT_CATEGORIES,
  normalizeCategoryList,
  normalizeCategoryName,
} from "@/lib/categories";
import { getOrCreateSettings } from "@/lib/app-settings-server";

const SETTINGS_ID = 1;

export function resolveContentCategories(
  settings: Pick<AppSettings, "contentCategories">,
): string[] {
  const categories = normalizeCategoryList(settings.contentCategories);
  if (categories.length > 0) return categories;
  return [...DEFAULT_CONTENT_CATEGORIES];
}

export async function loadContentCategories(): Promise<string[]> {
  const settings = await getOrCreateSettings();
  return resolveContentCategories(settings);
}

function renameInList(
  categories: readonly string[],
  from: string,
  to: string,
): string[] {
  return Array.from(
    new Set(categories.map((category) => (category === from ? to : category))),
  );
}

function stripFromList(
  categories: readonly string[],
  removed: ReadonlySet<string>,
): string[] {
  return categories.filter((category) => !removed.has(category));
}

export async function applyCategoryListUpdate(
  previous: readonly string[],
  next: readonly string[],
  rename?: { from: string; to: string },
): Promise<void> {
  const removed = new Set(
    previous.filter((category) => !next.includes(category)),
  );

  if (!rename && removed.size === 0) return;

  const allVideos = await db.select().from(videos);

  for (const video of allVideos) {
    let updated = [...video.categories];

    if (rename) {
      updated = renameInList(updated, rename.from, rename.to);
    }

    if (removed.size > 0) {
      updated = stripFromList(updated, removed);
    }

    if (updated.join("\0") !== video.categories.join("\0")) {
      await db
        .update(videos)
        .set({ categories: updated })
        .where(eq(videos.id, video.id));
    }
  }

  const settings = await getOrCreateSettings();
  let profilesChanged = false;

  const nextProfiles = settings.childProfiles.map((profile) => {
    let preferred = [...profile.preferredCategories];

    if (rename) {
      preferred = renameInList(preferred, rename.from, rename.to);
    }

    if (removed.size > 0) {
      preferred = stripFromList(preferred, removed);
    }

    if (preferred.join("\0") === profile.preferredCategories.join("\0")) {
      return profile;
    }

    profilesChanged = true;
    return { ...profile, preferredCategories: preferred };
  });

  if (!profilesChanged) return;

  await db
    .insert(appSettings)
    .values({ id: SETTINGS_ID, childProfiles: nextProfiles })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { childProfiles: nextProfiles },
    });
}

export function validateCategoryRename(
  previous: readonly string[],
  next: readonly string[],
  rename: { from: string; to: string },
): string | null {
  const from = normalizeCategoryName(rename.from);
  const to = normalizeCategoryName(rename.to);

  if (!from || !to) return "Category names cannot be empty.";
  if (!previous.includes(from)) return `Category "${from}" was not found.`;
  if (previous.includes(to) && from !== to) {
    return `Category "${to}" already exists.`;
  }

  const expected = previous.map((category) =>
    category === from ? to : category,
  );

  if (expected.join("\0") !== next.join("\0")) {
    return "Category list does not match the rename request.";
  }

  return null;
}
