import { z } from "zod";

export const videoInput = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional().default(""),
  videoUrl: z.string().min(1),
  thumbnailUrl: z.string().url().nullable().optional(),
  startSeconds: z.number().int().min(0).nullable().optional(),
  endSeconds: z.number().int().min(0).nullable().optional(),
});

export const videoUpdate = videoInput.partial();

export const settingsInput = z.object({
  screenTimeMinutes: z.number().int().min(1).max(180),
});

export type VideoInput = z.infer<typeof videoInput>;
export type SettingsInput = z.infer<typeof settingsInput>;
