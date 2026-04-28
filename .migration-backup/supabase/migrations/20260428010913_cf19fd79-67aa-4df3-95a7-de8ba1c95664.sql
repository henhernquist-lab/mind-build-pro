
-- Achievements (one row per unlocked badge)
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ach select own" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ach insert own" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ach update own" ON public.achievements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ach delete own" ON public.achievements FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX achievements_user_idx ON public.achievements(user_id);

-- Daily challenges
CREATE TABLE public.daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  challenge_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 1,
  progress INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 25,
  category TEXT NOT NULL DEFAULT 'academic',
  claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_date, challenge_id)
);
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dc select own" ON public.daily_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dc insert own" ON public.daily_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dc update own" ON public.daily_challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "dc delete own" ON public.daily_challenges FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX dc_user_date_idx ON public.daily_challenges(user_id, challenge_date);

CREATE TRIGGER daily_challenges_set_updated_at
BEFORE UPDATE ON public.daily_challenges
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Accent hue override
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS accent_hue INTEGER;
