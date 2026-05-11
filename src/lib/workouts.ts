// @ts-nocheck
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
    added_weight: entry.added_weight ?? null,
    is_pr: !!entry.isPR,
    grade: entry.grade ?? null,
    xp: entry.xp ?? null,
    note: entry.note ?? null,
    breakdown: entry.breakdown ?? null,
  }).select().single();
  if (error) throw error;
  // Achievements + daily challenge progress (best-effort)
  try {
    const { incrementChallengeProgress } = await import("@/lib/dailyChallenges");
    await incrementChallengeProgress(userId, "log_workout", 1);
    if (entry.isPR) {
      const { count } = await supabase
        .from("workout_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_pr", true);
      if ((count ?? 0) >= 5) {
        const { unlockBadge } = await import("@/lib/achievements");
        await unlockBadge(userId, "pr_machine");
      }
    }
  } catch {}
  return rowToEntry(data);
};

export const deleteEntry = async (id: string) => {
  const { error } = await supabase.from("workout_logs").delete().eq("id", id);
  if (error) throw error;
};

// --- New Session-based Workout functions ---

export const fetchRecentSessions = async (userId: string, limit = 5) => {
  const { data } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("finished_at", { ascending: false })
    .limit(limit);
  return data || [];
};

export const fetchAllTimePRs = async (userId: string) => {
  // We'll use session_sets for this
  const { data } = await supabase
    .from("session_sets")
    .select("exercise_name:session_exercises(exercise_name), weight_lbs, reps, time_seconds, distance_meters, completed_at")
    .eq("user_id", userId)
    .eq("is_pr", true)
    .order("completed_at", { ascending: false });

  // Transform and unique by exercise_name
  const seen = new Set();
  const prs: any[] = [];
  (data || []).forEach((row: any) => {
    const name = row.exercise_name?.exercise_name;
    if (name && !seen.has(name)) {
      seen.add(name);
      prs.push({
        exercise_name: name,
        value: row.weight_lbs || row.time_seconds || row.distance_meters,
        unit: row.weight_lbs ? "lbs" : (row.time_seconds ? "s" : "m"),
        date: row.completed_at
      });
    }
  });
  return prs;
};

export const fetchPreviousExerciseData = async (userId: string, exerciseName: string) => {
  const { data } = await supabase
    .from("session_sets")
    .select("weight_lbs, reps, time_seconds, distance_meters")
    .eq("user_id", userId)
    .eq("session_exercises.exercise_name", exerciseName)
    .order("completed_at", { ascending: false })
    .limit(1);

  if (data && data[0]) {
    const d = data[0];
    if (d.weight_lbs) return `${d.weight_lbs} × ${d.reps}`;
    if (d.time_seconds) return `${d.time_seconds}s`;
    return `${d.distance_meters}m`;
  }
  return null;
};

export const saveWorkoutSession = async (userId: string, session: any) => {
  // 1. Insert session
  const { data: sessionData, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      name: session.name,
      started_at: new Date(Date.now() - session.duration * 1000).toISOString(),
      finished_at: new Date().toISOString(),
      duration_seconds: session.duration,
      total_volume_lbs: session.totalVolume,
      total_sets: session.exercises.reduce((acc: number, ex: any) => acc + ex.sets.length, 0),
      total_reps: session.exercises.reduce((acc: number, ex: any) => acc + ex.sets.reduce((sAcc: number, s: any) => sAcc + (parseInt(s.reps) || 0), 0), 0),
      pr_count: session.prCount,
      xp_earned: session.xpEarned,
      rating: session.rating,
      local_date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  // 2. Insert exercises and sets
  for (const [index, ex] of session.exercises.entries()) {
    const { data: exData, error: exError } = await supabase
      .from("session_exercises")
      .insert({
        session_id: sessionData.id,
        user_id: userId,
        exercise_name: ex.name,
        exercise_id: ex.id,
        muscle_group: ex.muscle_group,
        exercise_type: ex.type,
        order_in_session: index
      })
      .select()
      .single();

    if (exError) throw exError;

    const setsToInsert = ex.sets.map((s: any, sIdx: number) => ({
      session_exercise_id: exData.id,
      session_id: sessionData.id,
      user_id: userId,
      set_number: sIdx + 1,
      weight_lbs: parseFloat(s.weight) || null,
      reps: parseInt(s.reps) || null,
      is_pr: !!s.isPR,
      grade: s.grade,
      completed_at: new Date().toISOString()
    }));

    const { error: setsError } = await supabase.from("session_sets").insert(setsToInsert);
    if (setsError) throw setsError;
  }

  return sessionData;
};

// --- Profile ---
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
    height_ft: p.height_ft,
    height_in: p.height_in,
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