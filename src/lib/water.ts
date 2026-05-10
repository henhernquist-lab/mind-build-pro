import { supabase } from "@/integrations/supabase/client";
import type { AthleticInfo } from "./profile";

// Cast to any to avoid TS2589 on manually-added tables
const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────

export type DrinkType = "water" | "sports_drink" | "juice" | "coffee" | "tea" | "soda" | "other";

export type WaterLog = {
  id: string;
  user_id: string;
  local_date: string;           // local date "YYYY-MM-DD" (never UTC)
  logged_at: string;          // ISO timestamp
  amount_ml: number;
  drink_type: DrinkType;
  is_water: boolean;
  hydration_credit_ml: number;
  input_method: "manual" | "camera_scan";
  notes?: string | null;
};

export type WaterGoalSource = "calculated" | "custom" | "default";

export type WaterGoalInfo = {
  goal_ml: number;
  source: WaterGoalSource;
  breakdown?: {
    weight_lbs: number;
    height_in: number;
    age: number;
    training_days: number;
    base_ml: number;
    height_bonus_ml: number;
    age_multiplier: number;
    activity_bonus_ml: number;
  };
  missing_fields?: string[];
};

export interface WaterChartDay {
  date: string;       // short weekday label e.g. "Mon"
  localDate: string;  // "YYYY-MM-DD"
  amount: number;     // sum of hydration_credit_ml
  goalHit: boolean;
}

// ─── Timezone helpers ─────────────────────────────────────────────────────────

/** Get the user's IANA timezone */
export const getUserTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Get today's local date string "YYYY-MM-DD" using the user's timezone */
export const getLocalToday = (): string =>
  new Date().toLocaleDateString("en-CA", { timeZone: getUserTimezone() });

/** Get a local date string for `daysAgo` days before today */
export const getLocalDateDaysAgo = (daysAgo: number): string => {
  const tz = getUserTimezone();
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: tz });
};

/** Get the last 7 local date strings (oldest first) */
export const getLast7LocalDates = (): string[] =>
  Array.from({ length: 7 }, (_, i) => getLocalDateDaysAgo(6 - i));

// ─── Hydration credit multipliers ─────────────────────────────────────────────

export const HYDRATION_MULTIPLIER: Record<DrinkType, number> = {
  water: 1.0,
  sports_drink: 0.8,
  juice: 0.6,
  coffee: 0.5,
  tea: 0.5,
  soda: 0.3,
  other: 0.7,
};

export const DRINK_LABELS: Record<DrinkType, { label: string; emoji: string; color: string }> = {
  water: { label: "Water", emoji: "💧", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  sports_drink: { label: "Sports Drink", emoji: "⚡", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  juice: { label: "Juice", emoji: "🧃", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  coffee: { label: "Coffee", emoji: "☕", color: "bg-amber-700/20 text-amber-500 border-amber-700/30" },
  tea: { label: "Tea", emoji: "🍵", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  soda: { label: "Soda", emoji: "🥤", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  other: { label: "Other", emoji: "🥤", color: "bg-muted text-muted-foreground border-border" },
};

export const hydrationCredit = (amount_ml: number, drink_type: DrinkType): number =>
  Math.round(amount_ml * HYDRATION_MULTIPLIER[drink_type]);

// ─── Personalized goal calculator ─────────────────────────────────────────────

export const calculateWaterGoal = (a: AthleticInfo | null): WaterGoalInfo => {
  // Return default 2000ml if profile is incomplete
  if (!a?.weight_lbs || !a?.height_ft || !a?.age) {
    const missing: string[] = [];
    if (!a?.weight_lbs) missing.push("weight");
    if (!a?.height_ft) missing.push("height");
    if (!a?.age) missing.push("age");
    return { goal_ml: 2000, source: "default", missing_fields: missing.length ? missing : ["age", "height", "weight"] };
  }

  const weightLbs = a.weight_lbs;
  const heightInches = (a.height_ft * 12) + (a.height_in || 0);
  const age = a.age;
  const trainingDays = a.training_days_per_week || 3;

  const baseOz = weightLbs * 0.6;
  const heightBonusOz = Math.max(0, (heightInches - 60) * 1);

  let ageMultiplier = 1.0;
  if (age <= 12) ageMultiplier = 0.85;
  else if (age === 13) ageMultiplier = 0.90;
  else if (age === 14) ageMultiplier = 0.95;
  else if (age === 15) ageMultiplier = 1.0;
  else if (age === 16) ageMultiplier = 1.05;
  else ageMultiplier = 1.10;

  let activityBonusOz = 0;
  if (trainingDays >= 5) activityBonusOz = 16;
  else if (trainingDays >= 3) activityBonusOz = 8;

  const totalOz = ((baseOz + heightBonusOz) * ageMultiplier) + activityBonusOz;
  const totalMl = Math.round(totalOz * 29.5735);
  const dailyGoalMl = Math.round(totalMl / 50) * 50;

  return {
    goal_ml: dailyGoalMl,
    source: "calculated",
    breakdown: {
      weight_lbs: weightLbs,
      height_in: heightInches,
      age,
      training_days: trainingDays,
      base_ml: Math.round(baseOz * 29.5735),
      height_bonus_ml: Math.round(heightBonusOz * 29.5735),
      age_multiplier: ageMultiplier,
      activity_bonus_ml: Math.round(activityBonusOz * 29.5735),
    },
  };
};

// ─── Supabase helpers ──────────────────────────────────────────────────────────

/**
 * Fetch today's water logs using local_date (timezone-correct).
 * Pass getLocalToday() as localDate — never a UTC date.
 */
export const fetchWaterLogs = async (userId: string, localDate: string): Promise<WaterLog[]> => {
  const { data, error } = await db
    .from("water_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("local_date", localDate)
    .order("logged_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WaterLog[];
};

export const fetchWaterLogsRange = async (
  userId: string, startDate: string, endDate: string,
): Promise<WaterLog[]> => {
  const { data, error } = await db
    .from("water_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("local_date", startDate)
    .lte("local_date", endDate)
    .order("local_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WaterLog[];
};

/**
 * Insert a water log. Always pass local_date from getLocalToday() — never UTC.
 */
export const insertWaterLog = async (
  userId: string,
  log: Omit<WaterLog, "id" | "user_id">,
): Promise<WaterLog> => {
  const { data, error } = await db
    .from("water_logs")
    .insert({ user_id: userId, ...log })
    .select()
    .single();
  if (error) throw error;
  return data as WaterLog;
};

export const deleteWaterLog = async (id: string) => {
  const { error } = await db.from("water_logs").delete().eq("id", id);
  if (error) throw error;
};

/** Sum hydration_credit_ml (NOT amount_ml) — this is the correct daily total */
export const sumWaterDay = (logs: WaterLog[]): number =>
  logs.reduce((acc, l) => acc + l.hydration_credit_ml, 0);

// ─── Streak (uses user_stats.water_streak) ────────────────────────────────────

/**
 * Update water streak in user_stats using timezone-correct local dates.
 * Returns the new streak count.
 */
export const updateWaterStreak = async (
  userId: string,
  userWaterGoal: number,
): Promise<number> => {
  try {
    const tz = getUserTimezone();
    const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone: tz });

    // Check if goal was hit today
    const { data: todayLogs } = await db
      .from("water_logs")
      .select("hydration_credit_ml")
      .eq("user_id", userId)
      .eq("local_date", today);
    const todayTotal = (todayLogs ?? []).reduce((sum: number, l: any) => sum + l.hydration_credit_ml, 0);
    const goalHitToday = todayTotal >= userWaterGoal;

    // Check if goal was hit yesterday
    const { data: yesterdayLogs } = await db
      .from("water_logs")
      .select("hydration_credit_ml")
      .eq("user_id", userId)
      .eq("local_date", yesterday);
    const yesterdayTotal = (yesterdayLogs ?? []).reduce((sum: number, l: any) => sum + l.hydration_credit_ml, 0);
    const goalHitYesterday = yesterdayTotal >= userWaterGoal;

    // Get current streak from user_stats
    const { data: stats } = await db
      .from("user_stats")
      .select("water_streak, last_water_streak_date")
      .eq("user_id", userId)
      .maybeSingle();

    let newStreak = stats?.water_streak || 0;

    if (goalHitToday && stats?.last_water_streak_date !== today) {
      // Goal hit today and not yet counted
      if (goalHitYesterday || stats?.last_water_streak_date === yesterday) {
        newStreak += 1; // continue streak
      } else {
        newStreak = 1; // restart streak
      }
      await db
        .from("user_stats")
        .update({ water_streak: newStreak, last_water_streak_date: today })
        .eq("user_id", userId);
    } else if (!goalHitYesterday && stats?.last_water_streak_date !== today) {
      // Missed yesterday and haven't hit today — streak broken
      if (newStreak > 0) {
        await db
          .from("user_stats")
          .update({ water_streak: 0 })
          .eq("user_id", userId);
        newStreak = 0;
      }
    }

    return newStreak;
  } catch {
    return 0;
  }
};

/** Read-only streak fetch from user_stats */
export const fetchWaterStreak = async (userId: string): Promise<number> => {
  try {
    const { data } = await db
      .from("user_stats")
      .select("water_streak")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.water_streak || 0;
  } catch {
    return 0;
  }
};

// ─── 7-day chart data ─────────────────────────────────────────────────────────

/**
 * Fetch and build the 7-day water chart data using timezone-correct local dates.
 */
export const fetchWaterChartData = async (
  userId: string,
  goalMl: number,
): Promise<WaterChartDay[]> => {
  const tz = getUserTimezone();
  const last7 = getLast7LocalDates();

  const { data: weekLogs } = await db
    .from("water_logs")
    .select("local_date, hydration_credit_ml")
    .eq("user_id", userId)
    .in("local_date", last7);

  return last7.map((localDate) => {
    const dayLogs = (weekLogs ?? []).filter((l: any) => l.local_date === localDate);
    const total = dayLogs.reduce((sum: number, l: any) => sum + l.hydration_credit_ml, 0);
    const label = new Date(localDate + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: tz,
    });
    return { date: label, localDate, amount: total, goalHit: total >= goalMl };
  });
};

// ─── Goal persistence ─────────────────────────────────────────────────────────

export const saveWaterGoal = async (userId: string, goal_ml: number, source: WaterGoalSource) => {
  const { error } = await db.from("user_water_goals").upsert(
    { user_id: userId, goal_ml, source, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) throw error;
};

export const fetchWaterGoalOverride = async (
  userId: string,
): Promise<{ goal_ml: number; source: WaterGoalSource } | null> => {
  try {
    const { data, error } = await db
      .from("user_water_goals")
      .select("goal_ml, source")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return { goal_ml: data.goal_ml as number, source: data.source as WaterGoalSource };
  } catch {
    return null;
  }
};
