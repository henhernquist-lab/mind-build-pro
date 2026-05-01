-- Per-user snapshot of a completed 2-week season
CREATE TABLE public.season_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  season_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  peak_athletic_rank_name TEXT,
  peak_athletic_rank_icon TEXT,
  peak_academic_rank_name TEXT,
  peak_academic_rank_icon TEXT,
  athletic_xp INTEGER NOT NULL DEFAULT 0,
  academic_xp INTEGER NOT NULL DEFAULT 0,
  total_workouts INTEGER NOT NULL DEFAULT 0,
  total_games INTEGER NOT NULL DEFAULT 0,
  total_prs INTEGER NOT NULL DEFAULT 0,
  top_subject TEXT,
  best_single_day_xp INTEGER NOT NULL DEFAULT 0,
  ai_recap TEXT,
  is_best_season BOOLEAN NOT NULL DEFAULT false,
  ceremony_seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, season_number)
);

ALTER TABLE public.season_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ss select own" ON public.season_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ss insert own" ON public.season_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ss update own" ON public.season_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ss delete own" ON public.season_snapshots FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_season_snapshots_user ON public.season_snapshots(user_id, season_number DESC);

-- Awards earned per snapshot
CREATE TABLE public.season_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snapshot_id UUID NOT NULL REFERENCES public.season_snapshots(id) ON DELETE CASCADE,
  award_type TEXT NOT NULL,
  award_name TEXT NOT NULL,
  award_icon TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.season_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa select own" ON public.season_awards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sa insert own" ON public.season_awards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sa delete own" ON public.season_awards FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_season_awards_snapshot ON public.season_awards(snapshot_id);

-- Opt-in for public season leaderboard
CREATE TABLE public.season_optin (
  user_id UUID NOT NULL PRIMARY KEY,
  opted_in BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.season_optin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "so select own" ON public.season_optin FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "so insert own" ON public.season_optin FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "so update own" ON public.season_optin FOR UPDATE USING (auth.uid() = user_id);

-- Public leaderboard function: top 10 opted-in users by current-period combined XP
CREATE OR REPLACE FUNCTION public.get_current_season_leaderboard(_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  username TEXT,
  athletic_xp INTEGER,
  academic_xp INTEGER,
  total_xp INTEGER,
  athletic_rank_icon TEXT,
  academic_rank_icon TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.username,
    COALESCE(us.xp, 0) AS athletic_xp,
    COALESCE(acs.xp, 0) AS academic_xp,
    (COALESCE(us.xp, 0) + COALESCE(acs.xp, 0))::INTEGER AS total_xp,
    NULL::TEXT AS athletic_rank_icon,
    NULL::TEXT AS academic_rank_icon
  FROM public.season_optin so
  JOIN public.profiles p ON p.user_id = so.user_id
  LEFT JOIN public.user_stats us ON us.user_id = p.user_id
  LEFT JOIN public.academic_stats acs ON acs.user_id = p.user_id
  WHERE so.opted_in = true
  ORDER BY (COALESCE(us.xp, 0) + COALESCE(acs.xp, 0)) DESC
  LIMIT GREATEST(LEAST(_limit, 50), 1);
$$;