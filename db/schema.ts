import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  categories: jsonb("categories")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  startSeconds: integer("start_seconds"),
  endSeconds: integer("end_seconds"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  screenTimeMinutes: integer("screen_time_minutes").notNull().default(15),
  queueVideoIds: jsonb("queue_video_ids")
    .$type<number[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  childProfiles: jsonb("child_profiles")
    .$type<ChildProfile[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
});

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;

export type WatchHistoryEntry = {
  videoId: number;
  title: string;
  watchedAt: string;
  status: "completed" | "skipped";
  watchedSeconds: number;
};

export type ChildProfile = {
  id: string;
  name: string;
  ageRange: string;
  screenTimeMinutes: number;
  screenTimeResetHours: number;
  preferredCategories: string[];
  watchHistory: WatchHistoryEntry[];
};
