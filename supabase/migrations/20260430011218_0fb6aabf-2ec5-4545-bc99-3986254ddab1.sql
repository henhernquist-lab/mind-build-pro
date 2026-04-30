
-- Seasons table
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  season_type TEXT NOT NULL CHECK (season_type IN ('spring','summer','fall','winter')),
  rank_type TEXT NOT NULL DEFAULT 'both' CHECK (rank_type IN ('athletic','academic','both')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','ended')),
  theme_color TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons are viewable by everyone"
  ON public.seasons FOR SELECT USING (true);

CREATE TRIGGER seasons_updated_at
  BEFORE UPDATE ON public.seasons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Season rewards (podium definitions)
CREATE TABLE public.season_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  placement INTEGER NOT NULL CHECK (placement BETWEEN 1 AND 10),
  bonus_xp INTEGER NOT NULL DEFAULT 0,
  badge_name TEXT,
  badge_icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(season_id, placement)
);

ALTER TABLE public.season_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Season rewards are viewable by everyone"
  ON public.season_rewards FOR SELECT USING (true);

-- Season results (per-user archived standings)
CREATE TABLE public.season_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rank_type TEXT NOT NULL CHECK (rank_type IN ('athletic','academic')),
  xp_earned INTEGER NOT NULL DEFAULT 0,
  placement INTEGER,
  bonus_xp_awarded INTEGER NOT NULL DEFAULT 0,
  badge_earned TEXT,
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(season_id, user_id, rank_type)
);

ALTER TABLE public.season_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own season results"
  ON public.season_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own season results to claim"
  ON public.season_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_season_results_season ON public.season_results(season_id, rank_type, placement);
CREATE INDEX idx_season_results_user ON public.season_results(user_id);
CREATE INDEX idx_seasons_status ON public.seasons(status, start_date);

-- Public leaderboard for an active season (live standings during the season)
CREATE OR REPLACE FUNCTION public.get_season_leaderboard(_season_id UUID, _limit INTEGER DEFAULT 25)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  username TEXT,
  xp INTEGER,
  rank_type TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (SELECT * FROM public.seasons WHERE id = _season_id)
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.username,
    CASE WHEN (SELECT rank_type FROM s) = 'academic' THEN COALESCE(acs.xp, 0)
         ELSE COALESCE(us.xp, 0) END AS xp,
    (SELECT rank_type FROM s) AS rank_type
  FROM public.profiles p
  LEFT JOIN public.user_stats us ON us.user_id = p.user_id
  LEFT JOIN public.academic_stats acs ON acs.user_id = p.user_id
  WHERE EXISTS (SELECT 1 FROM s)
  ORDER BY xp DESC
  LIMIT GREATEST(LEAST(_limit, 100), 1);
$$;

REVOKE EXECUTE ON FUNCTION public.get_season_leaderboard(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_season_leaderboard(UUID, INTEGER) TO authenticated;

-- Seed: create a current active season (Spring 2026) so the UI has something to show
INSERT INTO public.seasons (name, season_type, rank_type, start_date, end_date, status, theme_color, description)
VALUES (
  'Spring Championship 2026',
  'spring',
  'both',
  '2026-04-01',
  '2026-06-30',
  'active',
  '#10b981',
  'Compete for the top of the leaderboard. Top 3 in athletic & academic XP win bonus XP and an exclusive seasonal badge.'
);

-- Seed rewards for the active season
INSERT INTO public.season_rewards (season_id, placement, bonus_xp, badge_name, badge_icon)
SELECT id, 1, 500, 'Spring Champion', '🏆' FROM public.seasons WHERE name = 'Spring Championship 2026'
UNION ALL
SELECT id, 2, 250, 'Spring Silver', '🥈' FROM public.seasons WHERE name = 'Spring Championship 2026'
UNION ALL
SELECT id, 3, 100, 'Spring Bronze', '🥉' FROM public.seasons WHERE name = 'Spring Championship 2026';
