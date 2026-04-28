-- 1. profiles: add bio, grade, school, username
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- 2. athlete_profile: add new fields
ALTER TABLE public.athlete_profile
  ADD COLUMN IF NOT EXISTS primary_sports TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS other_sport TEXT,
  ADD COLUMN IF NOT EXISTS position_event TEXT,
  ADD COLUMN IF NOT EXISTS years_experience TEXT,
  ADD COLUMN IF NOT EXISTS fitness_goals TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS training_days_per_week INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS injuries TEXT;

-- 3. Avatars bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, owner-only write
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Avatars are publicly viewable') THEN
    CREATE POLICY "Avatars are publicly viewable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload their own avatar') THEN
    CREATE POLICY "Users can upload their own avatar"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update their own avatar') THEN
    CREATE POLICY "Users can update their own avatar"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can delete their own avatar') THEN
    CREATE POLICY "Users can delete their own avatar"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- 4. Public athlete card function
CREATE OR REPLACE FUNCTION public.get_public_athlete_card(_username TEXT)
RETURNS TABLE (
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  grade TEXT,
  school_name TEXT,
  age INTEGER,
  height_ft INTEGER,
  height_in INTEGER,
  weight_lbs INTEGER,
  primary_sports TEXT[],
  other_sport TEXT,
  position_event TEXT,
  years_experience TEXT,
  fitness_goals TEXT[],
  training_days_per_week INTEGER,
  total_xp INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.grade,
    p.school_name,
    a.age,
    a.height_ft,
    a.height_in,
    a.weight_lbs,
    a.primary_sports,
    a.other_sport,
    a.position_event,
    a.years_experience,
    a.fitness_goals,
    a.training_days_per_week,
    COALESCE(s.xp, 0)::INTEGER AS total_xp
  FROM public.profiles p
  LEFT JOIN public.athlete_profile a ON a.user_id = p.user_id
  LEFT JOIN public.user_stats s ON s.user_id = p.user_id
  WHERE LOWER(p.username) = LOWER(_username)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_athlete_card(TEXT) TO anon, authenticated;