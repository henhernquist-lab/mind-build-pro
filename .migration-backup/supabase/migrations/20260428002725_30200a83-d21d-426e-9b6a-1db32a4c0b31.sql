CREATE TABLE IF NOT EXISTS public.academic_profile (
  user_id UUID PRIMARY KEY,
  grade_level TEXT,
  gpa NUMERIC(3,2),
  gpa_weighted BOOLEAN NOT NULL DEFAULT false,
  strongest_subject TEXT,
  strongest_subject_override BOOLEAN NOT NULL DEFAULT false,
  needs_improvement TEXT,
  needs_improvement_override BOOLEAN NOT NULL DEFAULT false,
  academic_goals TEXT[] NOT NULL DEFAULT '{}'::text[],
  study_style TEXT,
  study_hours_per_day NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  homework_load TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acp select own" ON public.academic_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "acp insert own" ON public.academic_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "acp update own" ON public.academic_profile FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.academic_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  class_name TEXT NOT NULL,
  period TEXT,
  teacher TEXT,
  current_grade TEXT,
  current_grade_pct NUMERIC(5,2),
  difficulty TEXT NOT NULL DEFAULT 'Standard',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ac select own" ON public.academic_classes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ac insert own" ON public.academic_classes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ac update own" ON public.academic_classes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ac delete own" ON public.academic_classes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.academic_stats (
  user_id UUID PRIMARY KEY,
  xp INT NOT NULL DEFAULT 0,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  tutor_xp_today INT NOT NULL DEFAULT 0,
  tutor_xp_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acs select own" ON public.academic_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "acs insert own" ON public.academic_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "acs update own" ON public.academic_stats FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS period_start DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE public.rank_history
  ADD COLUMN IF NOT EXISTS rank_type TEXT NOT NULL DEFAULT 'athletic',
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE;

CREATE TABLE IF NOT EXISTS public.boss_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject_id TEXT NOT NULL,
  boss_name TEXT,
  boss_personality TEXT,
  boss_emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject_id)
);
ALTER TABLE public.boss_customizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc select own" ON public.boss_customizations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bc insert own" ON public.boss_customizations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bc update own" ON public.boss_customizations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bc delete own" ON public.boss_customizations FOR DELETE USING (auth.uid() = user_id);

DROP FUNCTION IF EXISTS public.get_public_athlete_card(text);
CREATE FUNCTION public.get_public_athlete_card(_username text)
RETURNS TABLE(
  username text, display_name text, avatar_url text, bio text, grade text,
  school_name text, age integer, height_ft integer, height_in integer,
  weight_lbs integer, primary_sports text[], other_sport text, position_event text,
  years_experience text, fitness_goals text[], training_days_per_week integer,
  total_xp integer, academic_xp integer, gpa numeric, grade_level text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    p.username, p.display_name, p.avatar_url, p.bio, p.grade, p.school_name,
    a.age, a.height_ft, a.height_in, a.weight_lbs, a.primary_sports, a.other_sport,
    a.position_event, a.years_experience, a.fitness_goals, a.training_days_per_week,
    COALESCE(s.xp, 0)::INT AS total_xp,
    COALESCE(acs.xp, 0)::INT AS academic_xp,
    acp.gpa, acp.grade_level
  FROM public.profiles p
  LEFT JOIN public.athlete_profile a ON a.user_id = p.user_id
  LEFT JOIN public.user_stats s ON s.user_id = p.user_id
  LEFT JOIN public.academic_stats acs ON acs.user_id = p.user_id
  LEFT JOIN public.academic_profile acp ON acp.user_id = p.user_id
  WHERE LOWER(p.username) = LOWER(_username)
  LIMIT 1;
$$;