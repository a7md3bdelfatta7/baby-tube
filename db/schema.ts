import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
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
  contentCategories: jsonb("content_categories")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
});

export const childProfiles = pgTable("child_profiles", {
  id: text("id").primaryKey(), // client-generated (createProfileId()); never serial
  name: text("name").notNull(),
  birthDate: text("birth_date").notNull().default(""),
  screenTimeMinutes: integer("screen_time_minutes").notNull().default(15),
  screenTimeResetHours: integer("screen_time_reset_hours").notNull().default(24),
  preferredCategories: jsonb("preferred_categories")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  watchHistory: jsonb("watch_history")
    .$type<WatchHistoryEntry[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const videoProgress = pgTable(
  "video_progress",
  {
    id: serial("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => childProfiles.id, { onDelete: "cascade" }),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    positionSeconds: integer("position_seconds").notNull(),
    totalSeconds: integer("total_seconds").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    profileVideoUnique: uniqueIndex("video_progress_profile_video_unique").on(
      table.profileId,
      table.videoId,
    ),
    profileIdIdx: index("video_progress_profile_id_idx").on(table.profileId),
  }),
);

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
export type ChildProfileRow = typeof childProfiles.$inferSelect;
export type VideoProgressRow = typeof videoProgress.$inferSelect;

export type WatchHistoryEntry = {
  videoId: number;
  title: string;
  watchedAt: string;
  status: "completed" | "skipped";
  watchedSeconds: number;
};

export type VideoProgressEntry = {
  videoId: number;
  positionSeconds: number;
  totalSeconds: number;
  updatedAt: string;
};

export type ChildProfile = {
  id: string;
  name: string;
  birthDate: string;
  screenTimeMinutes: number;
  screenTimeResetHours: number;
  preferredCategories: string[];
  watchHistory: WatchHistoryEntry[];
  videoProgress: VideoProgressEntry[];
};
