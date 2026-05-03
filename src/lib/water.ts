import { supabase } from "@/integrations/supabase/client";
import type { AthleticInfo } from "./profile";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DrinkType = "water" | "sports_drink" | "juice" | "coffee" | "tea" | "soda" | "other";

export type WaterLog = {
  id: string;
  user_id: string;
  log_date: string;           // YYYY-MM-DD
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
  if (!a) return { goal_ml: 2000, source: "default", missing_fields: ["age", "height", "weight", "training_days"] };

  const missing: string[] = [];
  if (!a.weight_lbs || a.weight_lbs <= 0) missing.push("weight");
  if (!a.age || a.age <= 0) missing.push("age");
  if (a.height_ft === undefined || a.height_in === undefined) missing.push("height");

  const weight = a.weight_lbs || 120;
  const heightInches = (a.height_ft || 5) * 12 + (a.height_in || 0);
  const age = a.age || 14;
  const trainingDays = a.training_days_per_week || 3;

  // Step 1 — base from weight
  const baseOz = weight * 0.6;

  // Step 2 — height bonus
  const heightBonusOz = Math.max(0, (heightInches - 60) * 1);

  // Step 3 — age multiplier
  let ageMultiplier = 1.0;
  if (age <= 12) ageMultiplier = 0.85;
  else if (age === 13) ageMultiplier = 0.90;
  else if (age === 14) ageMultiplier = 0.95;
  else if (age === 15) ageMultiplier = 1.0;
  else if (age === 16) ageMultiplier = 1.05;
  else ageMultiplier = 1.10;

  // Step 4 — activity bonus
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
      weight_lbs: weight,
      height_in: heightInches,
      age,
      training_days: trainingDays,
      base_ml: Math.round(baseOz * 29.5735),
      height_bonus_ml: Math.round(heightBonusOz * 29.5735),
      age_multiplier: ageMultiplier,
      activity_bonus_ml: Math.round(activityBonusOz * 29.5735),
    },
    missing_fields: missing.length > 0 ? missing : undefined,
  };
};

// ─── Supabase helpers ──────────────────────────────────────────────────────────

export const fetchWaterLogs = async (userId: string, date: string): Promise<WaterLog[]> => {
  const { data, error } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", date)
    .order("logged_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WaterLog[];
};

export const fetchWaterLogsRange = async (
  userId: string, startDate: string, endDate: string,
): Promise<WaterLog[]> => {
  const { data, error } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WaterLog[];
};

export const insertWaterLog = async (
  userId: string,
  log: Omit<WaterLog, "id" | "user_id">,
): Promise<WaterLog> => {
  const { data, error } = await supabase
    .from("water_logs")
    .insert({ user_id: userId, ...log })
    .select()
    .single();
  if (error) throw error;
  return data as WaterLog;
};

export const deleteWaterLog = async (id: string) => {
  const { error } = await supabase.from("water_logs").delete().eq("id", id);
  if (error) throw error;
};

export const sumWaterDay = (logs: WaterLog[]): number =>
  logs.reduce((acc, l) => acc + l.hydration_credit_ml, 0);

/** Compute consecutive days where water goal was hit */
export const computeWaterStreak = (
  logsRange: WaterLog[],
  goalMl: number,
): number => {
  if (logsRange.length === 0) return 0;
  const byDate: Record<string, number> = {};
  for (const l of logsRange) {
    byDate[l.log_date] = (byDate[l.log_date] ?? 0) + l.hydration_credit_ml;
  }
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if ((byDate[iso] ?? 0) >= goalMl) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
};

/** Save / update user's custom water goal in Supabase */
export const saveWaterGoal = async (userId: string, goal_ml: number, source: WaterGoalSource) => {
  const { error } = await supabase.from("user_water_goals").upsert({
    user_id: userId,
    goal_ml,
    source,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
};

export const fetchWaterGoalOverride = async (userId: string): Promise<{ goal_ml: number; source: WaterGoalSource } | null> => {
  const { data } = await supabase
    .from("user_water_goals")
    .select("goal_ml, source")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { goal_ml: (data as any).goal_ml, source: (data as any).source as WaterGoalSource };
};
