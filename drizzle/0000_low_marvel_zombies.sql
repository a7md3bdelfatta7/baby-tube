CREATE TABLE IF NOT EXISTS "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"screen_time_minutes" integer DEFAULT 15 NOT NULL,
	"queue_video_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"child_profiles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content_categories" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_seconds" integer,
	"end_seconds" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
