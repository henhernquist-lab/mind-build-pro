import { supabase } from "@/integrations/supabase/client";

export type Season = {
  id: string;
  name: string;
  season_type: "spring" | "summer" | "fall" | "winter";
  rank_type: "athletic" | "academic" | "both";
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "ended";
  theme_color: string | null;
  description: string | null;
};

export type SeasonReward = {
  id: string;
  season_id: string;
  placement: number;
  bonus_xp: number;
  badge_name: string | null;
  badge_icon: string | null;
};

export type SeasonResult = {
  id: string;
  season_id: string;
  user_id: string;
  rank_type: "athletic" | "academic";
  xp_earned: number;
  placement: number | null;
  bonus_xp_awarded: number;
  badge_earned: string | null;
  claimed: boolean;
  claimed_at: string | null;
};

export type SeasonLeaderRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  xp: number;
  rank_type: string;
};

export async function getActiveSeason(): Promise<Season | null> {
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Season) ?? null;
}

export async function listSeasons(): Promise<Season[]> {
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .order("start_date", { ascending: false });
  return (data as Season[]) ?? [];
}

export async function getSeasonRewards(seasonId: string): Promise<SeasonReward[]> {
  const { data } = await supabase
    .from("season_rewards")
    .select("*")
    .eq("season_id", seasonId)
    .order("placement", { ascending: true });
  return (data as SeasonReward[]) ?? [];
}

export async function getSeasonLeaderboard(seasonId: string, limit = 25): Promise<SeasonLeaderRow[]> {
  const { data } = await supabase.rpc("get_season_leaderboard", {
    _season_id: seasonId,
    _limit: limit,
  });
  return (data as SeasonLeaderRow[]) ?? [];
}

export async function getMySeasonResults(userId: string): Promise<SeasonResult[]> {
  const { data } = await supabase
    .from("season_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as SeasonResult[]) ?? [];
}

export async function claimSeasonReward(resultId: string): Promise<boolean> {
  const { error } = await supabase
    .from("season_results")
    .update({ claimed: true, claimed_at: new Date().toISOString() })
    .eq("id", resultId);
  return !error;
}

export function daysRemaining(season: Season): number {
  const end = new Date(season.end_date).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / 86400000));
}