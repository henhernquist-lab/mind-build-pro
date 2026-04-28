// Unified Athletic + Academic rank system with biweekly reset
// (Replaces useRankSystem in src/lib/rank.ts for new code; old hook still works for back-compat.)
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type Rank = { name: string; icon: string; xpRequired: number; color: string };

export const ATHLETIC_RANKS: Rank[] = [
  { name: "Recruit", icon: "🥉", xpRequired: 0, color: "hsl(var(--free))" },
  { name: "Varsity", icon: "🔵", xpRequired: 100, color: "hsl(var(--school))" },
  { name: "All-Star", icon: "⭐", xpRequired: 300, color: "hsl(var(--sports))" },
  { name: "Elite", icon: "🏆", xpRequired: 600, color: "hsl(var(--coding))" },
  { name: "Legend", icon: "🔥", xpRequired: 1000, color: "hsl(0 80% 60%)" },
];

export const ACADEMIC_RANKS: Rank[] = [
  { name: "Freshman", icon: "📖", xpRequired: 0, color: "hsl(220 70% 60%)" },
  { name: "Honor Roll", icon: "📝", xpRequired: 150, color: "hsl(var(--school))" },
  { name: "Dean's List", icon: "🎓", xpRequired: 400, color: "hsl(280 70% 60%)" },
  { name: "Scholar", icon: "🔬", xpRequired: 800, color: "hsl(var(--primary))" },
  { name: "Valedictorian", icon: "🧠", xpRequired: 1500, color: "hsl(45 90% 55%)" },
];

export type RankType = "athletic" | "academic";

export const PERIOD_DAYS = 14;

export const getRank = (xp: number, ranks: Rank[]): Rank => {
  let r = ranks[0];
  for (const c of ranks) {
    if (xp >= c.xpRequired) r = c;
    else break;
  }
  return r;
};

export const getNextRank = (xp: number, ranks: Rank[]): Rank | null => {
  for (const r of ranks) if (xp < r.xpRequired) return r;
  return null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

const formatPeriod = (start: string, end: string) => {
  const f = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const y = new Date(end).getFullYear();
  return `${f(start)} – ${f(end)}, ${y}`;
};

// Get hours/days remaining until next reset
export const getCountdown = (periodStart: string): { days: number; hours: number; total: number } => {
  const start = new Date(periodStart).getTime();
  const end = start + PERIOD_DAYS * 86400000;
  const ms = Math.max(0, end - Date.now());
  return {
    total: ms,
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
  };
};

// Generic stats fetcher (uses correct table per type)
const STATS_TABLE: Record<RankType, "user_stats" | "academic_stats"> = {
  athletic: "user_stats",
  academic: "academic_stats",
};

type StatRow = { xp: number; period_start: string };

export const fetchStats = async (userId: string, type: RankType): Promise<StatRow> => {
  const { data } = await supabase
    .from(STATS_TABLE[type])
    .select("xp, period_start")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    const today = todayISO();
    await supabase.from(STATS_TABLE[type]).upsert({ user_id: userId, xp: 0, period_start: today });
    return { xp: 0, period_start: today };
  }
  return { xp: (data as any).xp ?? 0, period_start: (data as any).period_start ?? todayISO() };
};

export const setStats = async (userId: string, type: RankType, xp: number, period_start: string) => {
  await supabase.from(STATS_TABLE[type]).upsert({ user_id: userId, xp, period_start });
};

export const insertHistory = async (
  userId: string,
  type: RankType,
  finalXp: number,
  rank: Rank,
  periodStart: string,
  periodEnd: string,
) => {
  await supabase.from("rank_history").insert({
    user_id: userId,
    rank_type: type,
    final_xp: finalXp,
    highest_rank_name: rank.name,
    highest_rank_icon: rank.icon,
    month_key: periodStart, // reuse column for period start
    month_name: formatPeriod(periodStart, periodEnd),
    period_start: periodStart,
    period_end: periodEnd,
  });
};

// Hook: load + manage one rank type
export const useRank = (type: RankType) => {
  const { user } = useAuth();
  const [xp, setXpState] = useState(0);
  const [periodStart, setPeriodStart] = useState<string>(todayISO());
  const [loaded, setLoaded] = useState(false);
  const ranks = type === "athletic" ? ATHLETIC_RANKS : ACADEMIC_RANKS;

  const reload = useCallback(async () => {
    if (!user) return;
    let s = await fetchStats(user.id, type);
    // Biweekly reset check
    if (daysBetween(s.period_start, todayISO()) >= PERIOD_DAYS) {
      const prevRank = getRank(s.xp, ranks);
      const today = todayISO();
      // Compute the actual end of the prior period
      const prevEnd = new Date(new Date(s.period_start).getTime() + PERIOD_DAYS * 86400000)
        .toISOString()
        .slice(0, 10);
      if (s.xp > 0 || prevRank.xpRequired > 0) {
        await insertHistory(user.id, type, s.xp, prevRank, s.period_start, prevEnd);
      }
      await setStats(user.id, type, 0, today);
      const label = type === "athletic" ? "Athletic" : "Academic";
      toast.success(`🆕 New ${label} period started`, {
        description: `Last period: ${prevRank.icon} ${prevRank.name} • ${s.xp} XP`,
        duration: 8000,
      });
      s = { xp: 0, period_start: today };
    }
    setXpState(s.xp);
    setPeriodStart(s.period_start);
    setLoaded(true);
  }, [user, type]);

  useEffect(() => { reload(); }, [reload]);

  const addXp = useCallback(async (amount: number) => {
    if (!user) return null;
    const before = xp;
    const after = Math.max(0, before + amount);
    const beforeRank = getRank(before, ranks);
    const afterRank = getRank(after, ranks);
    setXpState(after);
    await setStats(user.id, type, after, periodStart);
    if (beforeRank.name !== afterRank.name && after > before) {
      const label = type === "athletic" ? "Athletic" : "Academic";
      toast.success(`${type === "academic" ? "🎓" : "💪"} ${label} Rank Up!`, {
        description: `You are now ${afterRank.icon} ${afterRank.name}`,
        duration: 6000,
      });
    }
    return { rankedUp: beforeRank.name !== afterRank.name, newRank: afterRank };
  }, [user, type, xp, periodStart]);

  return {
    xp,
    rank: getRank(xp, ranks),
    nextRank: getNextRank(xp, ranks),
    countdown: getCountdown(periodStart),
    periodStart,
    addXp,
    loaded,
    reload,
  };
};

// One-shot XP add for non-React contexts
export const addRankXp = async (userId: string, type: RankType, amount: number) => {
  const s = await fetchStats(userId, type);
  const after = Math.max(0, s.xp + amount);
  await setStats(userId, type, after, s.period_start);
  const ranks = type === "athletic" ? ATHLETIC_RANKS : ACADEMIC_RANKS;
  return { before: s.xp, after, rank: getRank(after, ranks) };
};

// Tutor +5 XP/question with daily cap of 50
export const addTutorXp = async (userId: string): Promise<number> => {
  const today = todayISO();
  const { data } = await supabase
    .from("academic_stats")
    .select("xp, period_start, tutor_xp_today, tutor_xp_date")
    .eq("user_id", userId)
    .maybeSingle();
  let row = data as any;
  if (!row) {
    await supabase.from("academic_stats").upsert({ user_id: userId, xp: 0, period_start: today });
    row = { xp: 0, period_start: today, tutor_xp_today: 0, tutor_xp_date: today };
  }
  let usedToday = row.tutor_xp_date === today ? row.tutor_xp_today ?? 0 : 0;
  if (usedToday >= 50) return 0;
  const grant = Math.min(5, 50 - usedToday);
  const newXp = (row.xp ?? 0) + grant;
  await supabase.from("academic_stats").update({
    xp: newXp,
    tutor_xp_today: usedToday + grant,
    tutor_xp_date: today,
  }).eq("user_id", userId);
  return grant;
};

export const fetchAllHistory = async (userId: string) => {
  const { data } = await supabase
    .from("rank_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as any[];
};