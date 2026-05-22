import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  startSeconds: integer("start_seconds"),
  endSeconds: integer("end_seconds"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  screenTimeMinutes: integer("screen_time_minutes").notNull().default(15),
});

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
