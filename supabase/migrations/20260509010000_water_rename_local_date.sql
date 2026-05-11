-- Rename log_date -> local_date in water_logs (spec requires local_date field name)
ALTER TABLE public.water_logs RENAME COLUMN log_date TO local_date;

-- Update the index to use the new column name
DROP INDEX IF EXISTS water_logs_user_date_idx;
CREATE INDEX water_logs_user_date_idx ON public.water_logs (user_id, local_date DESC);

-- Add water_streak and last_water_streak_date to user_stats if not already present
ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS water_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_water_streak_date date;
