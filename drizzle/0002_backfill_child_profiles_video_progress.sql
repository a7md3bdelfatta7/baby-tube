CREATE OR REPLACE FUNCTION pg_temp.safe_legacy_timestamptz(input text)
RETURNS timestamptz
LANGUAGE plpgsql
STRICT
AS $$
BEGIN
  IF input !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt ][0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?([zZ]|[+-][0-9]{2}:[0-9]{2})$' THEN
    RETURN NULL;
  END IF;
  RETURN input::timestamptz;
EXCEPTION
  WHEN invalid_datetime_format OR datetime_field_overflow THEN
    RETURN NULL;
END;
$$;
--> statement-breakpoint

-- Keep the first duplicate profile, matching the API's legacy deduplication behavior.
WITH legacy_profiles AS (
  SELECT profile, profile_ordinality
  FROM "app_settings"
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof("app_settings"."child_profiles") = 'array'
        THEN "app_settings"."child_profiles"
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS profiles(profile, profile_ordinality)
  WHERE "app_settings"."id" = 1
    AND jsonb_typeof(profile) = 'object'
), first_profiles AS (
  SELECT DISTINCT ON (profile->>'id') profile, profile_ordinality
  FROM legacy_profiles
  WHERE NULLIF(profile->>'id', '') IS NOT NULL
  ORDER BY profile->>'id', profile_ordinality
)
INSERT INTO "child_profiles"
  ("id", "name", "birth_date", "screen_time_minutes", "screen_time_reset_hours",
   "preferred_categories", "watch_history", "created_at")
SELECT
  profile->>'id',
  COALESCE(NULLIF(profile->>'name', ''), 'Child'),
  COALESCE(profile->>'birthDate', ''),
  CASE
    WHEN profile->>'screenTimeMinutes' ~ '^[0-9]{1,3}$'
      THEN CASE
        WHEN (profile->>'screenTimeMinutes')::numeric BETWEEN 1 AND 180
          THEN (profile->>'screenTimeMinutes')::int
        ELSE 15
      END
    ELSE 15
  END,
  CASE
    WHEN profile->>'screenTimeResetHours' ~ '^[0-9]{1,3}$'
      THEN CASE
        WHEN (profile->>'screenTimeResetHours')::numeric BETWEEN 1 AND 168
          THEN (profile->>'screenTimeResetHours')::int
        ELSE 24
      END
    ELSE 24
  END,
  CASE
    WHEN jsonb_typeof(profile->'preferredCategories') = 'array'
      THEN profile->'preferredCategories'
    ELSE '[]'::jsonb
  END,
  CASE
    WHEN jsonb_typeof(profile->'watchHistory') = 'array'
      THEN profile->'watchHistory'
    ELSE '[]'::jsonb
  END,
  (statement_timestamp() AT TIME ZONE 'UTC')
    + ((profile_ordinality - 1) * interval '1 microsecond')
FROM first_profiles
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- Read progress only from the first duplicate profile and keep the first duplicate video.
WITH legacy_profiles AS (
  SELECT profile, profile_ordinality
  FROM "app_settings"
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof("app_settings"."child_profiles") = 'array'
        THEN "app_settings"."child_profiles"
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS profiles(profile, profile_ordinality)
  WHERE "app_settings"."id" = 1
    AND jsonb_typeof(profile) = 'object'
), first_profiles AS (
  SELECT DISTINCT ON (profile->>'id') profile, profile_ordinality
  FROM legacy_profiles
  WHERE NULLIF(profile->>'id', '') IS NOT NULL
  ORDER BY profile->>'id', profile_ordinality
), progress_text AS (
  SELECT
    profile->>'id' AS profile_id,
    progress->>'videoId' AS video_id_text,
    progress->>'positionSeconds' AS position_seconds_text,
    progress->>'totalSeconds' AS total_seconds_text,
    progress->>'updatedAt' AS updated_at_text,
    progress_ordinality
  FROM first_profiles
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(profile->'videoProgress') = 'array'
        THEN profile->'videoProgress'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS progress_entries(progress, progress_ordinality)
  WHERE jsonb_typeof(progress) = 'object'
), parsed_progress AS (
  SELECT
    profile_id,
    CASE WHEN video_id_text ~ '^[0-9]{1,10}$' THEN video_id_text::numeric END
      AS video_id,
    CASE WHEN position_seconds_text ~ '^[0-9]{1,5}$' THEN position_seconds_text::numeric END
      AS position_seconds,
    CASE WHEN total_seconds_text ~ '^[0-9]{1,5}$' THEN total_seconds_text::numeric END
      AS total_seconds,
    updated_at_text,
    progress_ordinality
  FROM progress_text
), valid_progress AS (
  SELECT
    profile_id,
    video_id::int AS video_id,
    position_seconds::int AS position_seconds,
    total_seconds::int AS total_seconds,
    COALESCE(
      pg_temp.safe_legacy_timestamptz(updated_at_text) AT TIME ZONE 'UTC',
      statement_timestamp() AT TIME ZONE 'UTC'
    ) AS updated_at,
    progress_ordinality
  FROM parsed_progress
  WHERE video_id BETWEEN 1 AND 2147483647
    AND position_seconds BETWEEN 0 AND 86400
    AND total_seconds BETWEEN 301 AND 86400
), first_progress AS (
  SELECT DISTINCT ON (profile_id, video_id)
    profile_id, video_id, position_seconds, total_seconds, updated_at
  FROM valid_progress
  ORDER BY profile_id, video_id, progress_ordinality
)
INSERT INTO "video_progress"
  ("profile_id", "video_id", "position_seconds", "total_seconds", "updated_at")
SELECT
  profile_id, video_id, position_seconds, total_seconds, updated_at
FROM first_progress
WHERE EXISTS (
  SELECT 1 FROM "videos" WHERE "videos"."id" = first_progress.video_id
)
ON CONFLICT ("profile_id", "video_id") DO NOTHING;
--> statement-breakpoint

-- The source remains available until both copies complete in the migrator transaction.
ALTER TABLE "app_settings" DROP COLUMN IF EXISTS "child_profiles";
