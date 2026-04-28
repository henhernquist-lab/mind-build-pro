
CREATE OR REPLACE FUNCTION public.get_leaderboard(_rank_type TEXT, _limit INTEGER DEFAULT 25)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  username TEXT,
  xp INTEGER,
  period_start DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.username,
    CASE WHEN _rank_type = 'academic' THEN COALESCE(acs.xp, 0) ELSE COALESCE(us.xp, 0) END AS xp,
    CASE WHEN _rank_type = 'academic' THEN acs.period_start ELSE us.period_start END AS period_start
  FROM public.profiles p
  LEFT JOIN public.user_stats us ON us.user_id = p.user_id
  LEFT JOIN public.academic_stats acs ON acs.user_id = p.user_id
  WHERE
    (_rank_type = 'academic' AND COALESCE(acs.xp, 0) > 0)
    OR (_rank_type = 'athletic' AND COALESCE(us.xp, 0) > 0)
  ORDER BY xp DESC
  LIMIT GREATEST(LEAST(_limit, 100), 1);
$$;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(TEXT, INTEGER) TO authenticated;
