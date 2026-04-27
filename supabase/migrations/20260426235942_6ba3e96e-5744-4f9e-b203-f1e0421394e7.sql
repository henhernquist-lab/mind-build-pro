-- =========== PROFILES ===========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert their profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- timestamp trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========== PLANNER BLOCKS ===========
CREATE TABLE public.planner_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT NOT NULL, -- "HH:MM"
  end_time TEXT NOT NULL,   -- "HH:MM"
  label TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'school',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planner_blocks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_planner_blocks_user_date ON public.planner_blocks(user_id, date);
CREATE POLICY "blocks select own" ON public.planner_blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "blocks insert own" ON public.planner_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blocks update own" ON public.planner_blocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "blocks delete own" ON public.planner_blocks FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_planner_blocks_updated BEFORE UPDATE ON public.planner_blocks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========== PLANNER RECURRING ===========
CREATE TABLE public.planner_recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'school',
  rule JSONB NOT NULL DEFAULT '{"type":"daily"}'::jsonb,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planner_recurring ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_planner_recurring_user ON public.planner_recurring(user_id);
CREATE POLICY "recurring select own" ON public.planner_recurring FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recurring insert own" ON public.planner_recurring FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recurring update own" ON public.planner_recurring FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recurring delete own" ON public.planner_recurring FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_planner_recurring_updated BEFORE UPDATE ON public.planner_recurring
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========== PLANNER OVERRIDES ===========
CREATE TABLE public.planner_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_id UUID NOT NULL REFERENCES public.planner_recurring(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  override_type TEXT NOT NULL, -- 'skip' or 'replace'
  label TEXT,
  category TEXT,
  start_time TEXT,
  end_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, recurring_id, date)
);
ALTER TABLE public.planner_overrides ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_planner_overrides_user_date ON public.planner_overrides(user_id, date);
CREATE POLICY "ovr select own" ON public.planner_overrides FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ovr insert own" ON public.planner_overrides FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ovr update own" ON public.planner_overrides FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ovr delete own" ON public.planner_overrides FOR DELETE USING (auth.uid() = user_id);

-- =========== WORKOUT LOGS ===========
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport TEXT NOT NULL,
  exercise TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  added_weight NUMERIC,
  is_pr BOOLEAN DEFAULT false,
  grade TEXT,
  xp INTEGER,
  note TEXT,
  breakdown TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_workout_logs_user ON public.workout_logs(user_id, logged_at DESC);
CREATE POLICY "wl select own" ON public.workout_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wl insert own" ON public.workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wl update own" ON public.workout_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wl delete own" ON public.workout_logs FOR DELETE USING (auth.uid() = user_id);

-- =========== ATHLETE PROFILE ===========
CREATE TABLE public.athlete_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER NOT NULL DEFAULT 13,
  height_ft INTEGER NOT NULL DEFAULT 5,
  height_in INTEGER NOT NULL DEFAULT 0,
  weight_lbs INTEGER NOT NULL DEFAULT 120,
  gender TEXT NOT NULL DEFAULT 'male',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.athlete_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ap select own" ON public.athlete_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ap insert own" ON public.athlete_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ap update own" ON public.athlete_profile FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_athlete_profile_updated BEFORE UPDATE ON public.athlete_profile
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========== USER STATS (xp + month) ===========
CREATE TABLE public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  current_month TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "us select own" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "us insert own" ON public.user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "us update own" ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_stats_updated BEFORE UPDATE ON public.user_stats
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========== RANK HISTORY ===========
CREATE TABLE public.rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  month_name TEXT NOT NULL,
  final_xp INTEGER NOT NULL,
  highest_rank_name TEXT NOT NULL,
  highest_rank_icon TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_key)
);
ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_rank_history_user ON public.rank_history(user_id, created_at DESC);
CREATE POLICY "rh select own" ON public.rank_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rh insert own" ON public.rank_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rh delete own" ON public.rank_history FOR DELETE USING (auth.uid() = user_id);

-- =========== SUBJECTS ===========
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📚',
  color TEXT NOT NULL DEFAULT 'school',
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_subjects_user ON public.subjects(user_id, sort_order);
CREATE POLICY "subj select own" ON public.subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subj insert own" ON public.subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subj update own" ON public.subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "subj delete own" ON public.subjects FOR DELETE USING (auth.uid() = user_id);

-- =========== USER PREFERENCES ===========
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'midnight',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "up select own" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "up insert own" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "up update own" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_preferences_updated BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();