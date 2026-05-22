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

export const videoUpdate = videoInput.partial();

export const settingsInput = z.object({
  screenTimeMinutes: z.number().int().min(1).max(180),
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
