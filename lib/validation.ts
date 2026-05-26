import { z } from "zod";
import { CONTENT_CATEGORIES, normalizeCategories } from "@/lib/categories";

export const videoInput = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional().default(""),
  videoUrl: z.string().min(1),
  thumbnailUrl: z.string().url().nullable().optional(),
  categories: z
    .array(z.enum(CONTENT_CATEGORIES))
    .max(CONTENT_CATEGORIES.length)
    .optional()
    .default([])
    .transform((categories) => normalizeCategories(categories)),
  startSeconds: z.number().int().min(0).nullable().optional(),
  endSeconds: z.number().int().min(0).nullable().optional(),
});

export const videoUpdate = videoInput
  .extend({
    position: z.number().int().min(0).optional(),
  })
  .partial();

export const settingsInput = z.object({
  screenTimeMinutes: z.number().int().min(1).max(180),
});

export const watchHistoryEntryInput = z.object({
  videoId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  watchedAt: z.string().datetime(),
  status: z.enum(["completed", "skipped"]).default("completed"),
  watchedSeconds: z.number().int().min(0).max(24 * 60 * 60).default(0),
});

export const childProfileInput = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  ageRange: z.string().max(80).default(""),
  screenTimeMinutes: z.number().int().min(1).max(180),
  screenTimeResetHours: z.number().int().min(1).max(168).default(24),
  preferredCategories: z
    .array(z.enum(CONTENT_CATEGORIES))
    .max(CONTENT_CATEGORIES.length)
    .default([])
    .transform((categories) => normalizeCategories(categories)),
  watchHistory: z.array(watchHistoryEntryInput).max(100).default([]),
});

export const profilesInput = z.object({
  childProfiles: z
    .array(childProfileInput)
    .max(12)
    .transform((profiles) => {
      const seen = new Set<string>();

      return profiles.filter((profile) => {
        if (seen.has(profile.id)) return false;
        seen.add(profile.id);
        return true;
      });
    }),
});

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

export type VideoInput = z.infer<typeof videoInput>;
export type SettingsInput = z.infer<typeof settingsInput>;
export type QueueInput = z.infer<typeof queueInput>;
export type ProfilesInput = z.infer<typeof profilesInput>;
export type WatchHistoryInput = z.infer<typeof watchHistoryInput>;
