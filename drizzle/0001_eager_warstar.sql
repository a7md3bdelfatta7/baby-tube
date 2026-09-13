CREATE TABLE "child_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"birth_date" text DEFAULT '' NOT NULL,
	"screen_time_minutes" integer DEFAULT 15 NOT NULL,
	"screen_time_reset_hours" integer DEFAULT 24 NOT NULL,
	"preferred_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"watch_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"video_id" integer NOT NULL,
	"position_seconds" integer NOT NULL,
	"total_seconds" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_profile_id_child_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "video_progress_profile_video_unique" ON "video_progress" USING btree ("profile_id","video_id");--> statement-breakpoint
CREATE INDEX "video_progress_profile_id_idx" ON "video_progress" USING btree ("profile_id");
-- NOTE (hand-edit, plan.md D2): drizzle-kit auto-folded
-- `ALTER TABLE "app_settings" DROP COLUMN IF EXISTS "child_profiles"` into this
-- generated delta. Moved to the end of 0002 (after the backfill INSERTs) on purpose:
-- 0000/0001/0002 run inside a single migrator transaction (plan.md §1), so dropping
-- the column here would make it invisible to 0002's backfill SELECT within that same
-- transaction. Do not move this back or re-add it here without re-verifying ordering.