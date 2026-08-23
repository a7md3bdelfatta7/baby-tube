import { z } from "zod";
import { isValidBirthDate } from "@/lib/age";
import { normalizeCategories, normalizeCategoryList } from "@/lib/categories";

const birthDateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must be YYYY-MM-DD")
  .refine((value) => isValidBirthDate(value), {
    message: "Birth date must be a real date, not in the future, and age 0–18",
  });

const categoryName = z
  .string()
  .trim()
  .min(1, "Category name is required")
  .max(80, "Category name must be 80 characters or fewer");

function categoriesField(allowed: readonly string[]) {
  return z
    .array(z.string())
    .max(Math.max(allowed.length, 1))
    .optional()
    .default([])
    .transform((categories) => normalizeCategories(categories, allowed));
}

export function createVideoInput(allowed: readonly string[]) {
  return z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional().default(""),
    videoUrl: z.string().min(1),
    thumbnailUrl: z.string().url().nullable().optional(),
    categories: categoriesField(allowed),
    startSeconds: z.number().int().min(0).nullable().optional(),
    endSeconds: z.number().int().min(0).nullable().optional(),
  });
}

export function createVideoUpdate(allowed: readonly string[]) {
  return createVideoInput(allowed)
    .extend({
      position: z.number().int().min(0).optional(),
    })
    .partial();
}

export const watchHistoryEntryInput = z.object({
  videoId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  watchedAt: z.string().datetime(),
  status: z.enum(["completed", "skipped"]).default("completed"),
  watchedSeconds: z.number().int().min(0).max(24 * 60 * 60).default(0),
});

export function createChildProfileInput(allowed: readonly string[]) {
  return z.object({
    id: z.string().min(1).max(80),
    name: z.string().min(1).max(80),
    birthDate: birthDateInput,
    screenTimeMinutes: z.number().int().min(1).max(180),
    screenTimeResetHours: z.number().int().min(1).max(168).default(24),
    preferredCategories: categoriesField(allowed),
    watchHistory: z.array(watchHistoryEntryInput).max(100).default([]),
  });
}

/** Lenient read shape so legacy profiles without birthDate still load. */
export function createChildProfileRead(allowed: readonly string[]) {
  return createChildProfileInput(allowed).extend({
    birthDate: z.string().default(""),
  });
}

function dedupeProfiles<T extends { id: string }>(profiles: T[]): T[] {
  const seen = new Set<string>();

  return profiles.filter((profile) => {
    if (seen.has(profile.id)) return false;
    seen.add(profile.id);
    return true;
  });
}

export function createProfilesInput(allowed: readonly string[]) {
  return z.object({
    childProfiles: z
      .array(createChildProfileInput(allowed))
      .max(12)
      .transform((profiles) => dedupeProfiles(profiles)),
  });
}

export function createProfilesRead(allowed: readonly string[]) {
  return z.object({
    childProfiles: z
      .array(createChildProfileRead(allowed))
      .max(12)
      .transform((profiles) => dedupeProfiles(profiles)),
  });
}

export const settingsInput = z
  .object({
    screenTimeMinutes: z.number().int().min(1).max(180).optional(),
    contentCategories: z
      .array(categoryName)
      .min(1, "Keep at least one category")
      .max(50)
      .transform((categories) => normalizeCategoryList(categories))
      .optional(),
    categoryRename: z
      .object({
        from: categoryName,
        to: categoryName,
      })
      .optional(),
  })
  .refine(
    (value) =>
      value.screenTimeMinutes !== undefined ||
      value.contentCategories !== undefined,
    { message: "No settings fields to update" },
  );

export const watchHistoryInput = z.object({
  profileId: z.string().min(1).max(80),
  videoId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  status: z.enum(["completed", "skipped"]),
  watchedSeconds: z.number().int().min(0).max(24 * 60 * 60),
});

export const queueInput = z.object({
  queueVideoIds: z
    .array(z.number().int().positive())
    .max(100)
    .transform((ids) => Array.from(new Set(ids))),
});

export type SettingsInput = z.infer<typeof settingsInput>;
export type QueueInput = z.infer<typeof queueInput>;
export type WatchHistoryInput = z.infer<typeof watchHistoryInput>;
