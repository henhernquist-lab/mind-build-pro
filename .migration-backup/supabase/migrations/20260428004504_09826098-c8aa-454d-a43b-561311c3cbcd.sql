ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS sounds_enabled boolean NOT NULL DEFAULT true;