import { supabase } from "@/integrations/supabase/client";
import { ATHLETIC_RANKS, ACADEMIC_RANKS, getRank, PERIOD_DAYS } from "@/lib/ranks2";

export type SeasonSnapshot = {
  id: string;
  user_id: string;
  season_number: number;
  start_date: string;
  end_date: string;
  peak_athletic_rank_name: string | null;
  peak_athletic_rank_icon: string | null;
  peak_academic_rank_name: string | null;
  peak_academic_rank_icon: string | null;
  athletic_xp: number;
  academic_xp: number;
  total_workouts: number;
  total_games: number;
  total_prs: number;
  top_subject: string | null;
  best_single_day_xp: number;
  ai_recap: string | null;
  is_best_season: boolean;
  ceremony_seen: boolean;
  created_at: string;
};

export type SeasonAward = {
  id: string;
  user_id: string;
  snapshot_id: string;
  award_type: string;
  award_name: string;
  award_icon: string;
  description: string | null;
  created_at: string;
};

export type CurrentLeaderRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  athletic_xp: number;
  academic_xp: number;
  total_xp: number;
  athletic_rank_icon: string | null;
  academic_rank_icon: string | null;
};

export async function listSnapshots(userId: string): Promise<SeasonSnapshot[]> {
  const { data } = await supabase
    .from("season_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("season_number", { ascending: false });
  return (data as SeasonSnapshot[]) ?? [];
}

export async function listAwards(userId: string): Promise<SeasonAward[]> {
  const { data } = await supabase
    .from("season_awards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as SeasonAward[]) ?? [];
}

export async function getOptIn(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("season_optin")
    .select("opted_in")
    .eq("user_id", userId)
    .maybeSingle();
  return !!(data as any)?.opted_in;
}

export async function setOptIn(userId: string, opted: boolean) {
  await supabase.from("season_optin").upsert({ user_id: userId, opted_in: opted, updated_at: new Date().toISOString() });
}

export async function getCurrentLeaderboard(limit = 10): Promise<CurrentLeaderRow[]> {
  const { data } = await supabase.rpc("get_current_season_leaderboard", { _limit: limit });
  const rows = (data as CurrentLeaderRow[]) ?? [];
  // Enrich rank icons client-side
  return rows.map((r) => ({
    ...r,
    athletic_rank_icon: getRank(r.athletic_xp, ATHLETIC_RANKS).icon,
    academic_rank_icon: getRank(r.academic_xp, ACADEMIC_RANKS).icon,
  }));
}

// Compute auto-awards for a snapshot vs prior history
export type AwardCandidate = {
  award_type: string;
  award_name: string;
  award_icon: string;
  description: string;
};

export function computeAwards(
  snap: Pick<SeasonSnapshot, "athletic_xp" | "academic_xp" | "total_prs" | "season_number">,
  history: SeasonSnapshot[],
  perfectWeek: boolean,
): AwardCandidate[] {
  const awards: AwardCandidate[] = [];
  const past = history.filter((h) => h.season_number < snap.season_number);
  const maxAth = Math.max(0, ...past.map((h) => h.athletic_xp));
  const maxAcad = Math.max(0, ...past.map((h) => h.academic_xp));
  const prev = past.find((h) => h.season_number === snap.season_number - 1);

  if (snap.athletic_xp > 0 && snap.athletic_xp >= maxAth) {
    awards.push({ award_type: "athlete_season", award_name: "Athlete of the Season", award_icon: "🏅", description: "Highest athletic XP ever" });
  }
  if (snap.academic_xp > 0 && snap.academic_xp >= maxAcad) {
    awards.push({ award_type: "scholar_season", award_name: "Scholar of the Season", award_icon: "📚", description: "Highest academic XP ever" });
  }
  if (prev) {
    const prevTotal = prev.athletic_xp + prev.academic_xp;
    const curTotal = snap.athletic_xp + snap.academic_xp;
    if (prevTotal > 0 && curTotal > prevTotal * 1.25) {
      awards.push({ award_type: "most_improved", award_name: "Most Improved", award_icon: "🔥", description: "+25% XP vs last season" });
    }
  }
  if (snap.total_prs >= 3) {
    awards.push({ award_type: "pr_machine", award_name: "PR Machine", award_icon: "💪", description: `${snap.total_prs} PRs set` });
  }
  // On a Roll: 3 consecutive seasons of XP improvement (this + 2 prior)
  const last2 = past
    .sort((a, b) => b.season_number - a.season_number)
    .slice(0, 2);
  if (last2.length === 2) {
    const totals = [last2[1].athletic_xp + last2[1].academic_xp, last2[0].athletic_xp + last2[0].academic_xp, snap.athletic_xp + snap.academic_xp];
    if (totals[0] < totals[1] && totals[1] < totals[2]) {
      awards.push({ award_type: "on_a_roll", award_name: "On a Roll", award_icon: "📈", description: "3 consecutive better seasons" });
    }
  }
  if (perfectWeek) {
    awards.push({ award_type: "perfect_week", award_name: "Perfect Week", award_icon: "🎯", description: "7 days straight of activity" });
  }
  return awards;
}

// Aggregate stats for a closed period from logs
export async function aggregatePeriodStats(userId: string, startDate: string, endDate: string) {
  const startISO = `${startDate}T00:00:00Z`;
  const endISO = `${endDate}T23:59:59Z`;

  const [workouts, games, lifts] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("logged_at,is_pr,xp")
      .eq("user_id", userId)
      .gte("logged_at", startISO)
      .lte("logged_at", endISO),
    supabase
      .from("saved_chats")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", startISO)
      .lte("created_at", endISO),
    supabase
      .from("lift_max_history")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", startISO)
      .lte("created_at", endISO),
  ]);

  const wRows = (workouts.data as any[]) ?? [];
  const totalWorkouts = wRows.length;
  const totalPRs = wRows.filter((w) => w.is_pr).length + ((lifts.data as any[]) ?? []).length;
  const totalGames = ((games.data as any[]) ?? []).length;

  // Daily XP buckets (workout logs only — academic activity isn't dated by day in study_streak alone)
  const dayMap: Record<string, number> = {};
  for (const w of wRows) {
    const d = (w.logged_at as string).slice(0, 10);
    dayMap[d] = (dayMap[d] || 0) + (w.xp ?? 0);
  }
  const bestSingleDayXp = Math.max(0, ...Object.values(dayMap));

  // Perfect week: any 7 consecutive days within range with activity each day
  const days: string[] = [];
  for (let t = new Date(startDate).getTime(); t <= new Date(endDate).getTime(); t += 86400000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  let perfectWeek = false;
  for (let i = 0; i + 7 <= days.length; i++) {
    if (days.slice(i, i + 7).every((d) => dayMap[d] > 0)) {
      perfectWeek = true;
      break;
    }
  }

  // Top subject by XP — proxy via saved_chats subject_label counts
  let topSubject: string | null = null;
  const sCounts: Record<string, number> = {};
  const { data: chats } = await supabase
    .from("saved_chats")
    .select("subject_label")
    .eq("user_id", userId)
    .gte("created_at", startISO)
    .lte("created_at", endISO);
  for (const c of (chats as any[]) ?? []) {
    if (c.subject_label) sCounts[c.subject_label] = (sCounts[c.subject_label] || 0) + 1;
  }
  const top = Object.entries(sCounts).sort((a, b) => b[1] - a[1])[0];
  if (top) topSubject = top[0];

  return { totalWorkouts, totalGames, totalPRs, bestSingleDayXp, perfectWeek, topSubject };
}

export async function generateRecap(input: {
  athleticXp: number;
  academicXp: number;
  athleticRank: string;
  academicRank: string;
  totalPRs: number;
  totalWorkouts: number;
  topSubject: string | null;
  seasonNumber: number;
}): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("season-recap", { body: input });
    if (error) throw error;
    return (data as any)?.recap ?? fallbackRecap(input);
  } catch {
    return fallbackRecap(input);
  }
}

function fallbackRecap(i: { seasonNumber: number; athleticRank: string; totalPRs: number }) {
  return `Season ${i.seasonNumber} — You hit ${i.athleticRank} rank${i.totalPRs ? ` and set ${i.totalPRs} PR${i.totalPRs > 1 ? "s" : ""}` : ""}. Keep stacking wins.`;
}

// (PERIOD_DAYS_EXPORT removed — was unused and caused a circular-import TDZ error)

// Refresh "best season" flag — highest combined XP wins
export async function refreshBestSeasonFlag(userId: string) {
  const list = await listSnapshots(userId);
  if (list.length === 0) return;
  let bestId = list[0].id;
  let bestTotal = -1;
  for (const s of list) {
    const t = s.athletic_xp + s.academic_xp;
    if (t > bestTotal) { bestTotal = t; bestId = s.id; }
  }
  await Promise.all([
    supabase.from("season_snapshots").update({ is_best_season: false }).eq("user_id", userId).neq("id", bestId),
    supabase.from("season_snapshots").update({ is_best_season: true }).eq("id", bestId),
  ]);
}