// Workouts data layer — Supabase-backed.
import { supabase } from "@/integrations/supabase/client";
import { AthleteProfile, Grade, Unit } from "@/lib/athlete";

export type Sport = "weightlifting" | "running";
export type Entry = {
  id: string;
  sport: Sport;
  exercise: string;
  value: number;
  unit: Unit;
  addedWeight?: number; // always stored in lbs
  isPR?: boolean;
  grade?: Grade;
  xp?: number;
  note?: string;
  breakdown?: string;
  loggedAt: string;
};

const rowToEntry = (r: any): Entry => ({
  id: r.id,
  sport: r.sport as Sport,
  exercise: r.exercise,
  value: Number(r.value),
  unit: r.unit as Unit,
  addedWeight: r.added_weight != null ? Number(r.added_weight) : undefined,
  isPR: !!r.is_pr,
  grade: (r.grade ?? undefined) as Grade | undefined,
  xp: r.xp ?? undefined,
  note: r.note ?? undefined,
  breakdown: r.breakdown ?? undefined,
  loggedAt: r.logged_at,
});

export const fetchEntries = async (userId: string, sport: Sport): Promise<Entry[]> => {
  const { data } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("sport", sport)
    .order("logged_at", { ascending: true });
  return (data ?? []).map(rowToEntry);
};

export const insertEntry = async (userId: string, entry: Omit<Entry, "id" | "loggedAt">) => {
  const { data, error } = await supabase.from("workout_logs").insert({
    user_id: userId,
    sport: entry.sport,
    exercise: entry.exercise,
    value: entry.value,
    unit: entry.unit,
    added_weight: entry.addedWeight ?? null,
    is_pr: !!entry.isPR,
    grade: entry.grade ?? null,
    xp: entry.xp ?? null,
    note: entry.note ?? null,
    breakdown: entry.breakdown ?? null,
  }).select().single();
  if (error) throw error;
  return rowToEntry(data);
};

export const deleteEntry = async (id: string) => {
  const { error } = await supabase.from("workout_logs").delete().eq("id", id);
  if (error) throw error;
};

// Athlete profile
export const fetchAthleteProfile = async (userId: string): Promise<AthleteProfile | null> => {
  const { data } = await supabase
    .from("athlete_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    age: data.age,
    heightFt: data.height_ft,
    heightIn: data.height_in,
    weightLbs: data.weight_lbs,
    gender: data.gender as any,
  };
};

export const saveAthleteProfile = async (userId: string, p: AthleteProfile) => {
  await supabase.from("athlete_profile").upsert({
    user_id: userId,
    age: p.age,
    height_ft: p.heightFt,
    height_in: p.heightIn,
    weight_lbs: p.weightLbs,
    gender: p.gender,
  });
};

// User stats / XP
const monthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const fetchUserStats = async (userId: string): Promise<{ xp: number; currentMonth: string }> => {
  const { data } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { xp: 0, currentMonth: monthKey() };
  return { xp: data.xp ?? 0, currentMonth: data.current_month ?? monthKey() };
};

export const saveUserStats = async (userId: string, xp: number, currentMonth: string) => {
  await supabase.from("user_stats").upsert({ user_id: userId, xp, current_month: currentMonth });
};

export type RankHistoryRow = {
  monthKey: string;
  monthName: string;
  finalXp: number;
  highestRankName: string;
  highestRankIcon: string;
};

export const fetchRankHistory = async (userId: string): Promise<RankHistoryRow[]> => {
  const { data } = await supabase
    .from("rank_history")
    .select("*")
    .eq("user_id", userId)
    .order("month_key", { ascending: false });
  return (data ?? []).map((r: any) => ({
    monthKey: r.month_key,
    monthName: r.month_name,
    finalXp: r.final_xp,
    highestRankName: r.highest_rank_name,
    highestRankIcon: r.highest_rank_icon,
  }));
};

export const insertRankHistory = async (userId: string, entry: RankHistoryRow) => {
  await supabase.from("rank_history").insert({
    user_id: userId,
    month_key: entry.monthKey,
    month_name: entry.monthName,
    final_xp: entry.finalXp,
    highest_rank_name: entry.highestRankName,
    highest_rank_icon: entry.highestRankIcon,
  });
};

export { monthKey };

// User preferences
export type Prefs = {
  theme?: string;
  weight_unit: "lbs" | "kg";
  videos_enabled: boolean;
  first_name?: string | null;
};

export const fetchPrefs = async (userId: string): Promise<Prefs> => {
  const { data } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    theme: data?.theme,
    weight_unit: ((data as any)?.weight_unit ?? "lbs") as "lbs" | "kg",
    videos_enabled: !!(data as any)?.videos_enabled,
    first_name: (data as any)?.first_name ?? null,
  };
};

export const savePrefs = async (userId: string, patch: Partial<Prefs>) => {
  await supabase.from("user_preferences").upsert({ user_id: userId, ...patch });
};