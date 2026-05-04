import { supabase } from "@/integrations/supabase/client";
import type { AthleticInfo } from "./profile";

export type MealType = "breakfast" | "lunch" | "dinner" | "pre_workout" | "post_workout" | "snack";

export const MEAL_TYPES: { id: MealType; label: string; emoji: string }[] = [
  { id: "breakfast", label: "Breakfast", emoji: "🥞" },
  { id: "lunch", label: "Lunch", emoji: "🥗" },
  { id: "dinner", label: "Dinner", emoji: "🍽️" },
  { id: "pre_workout", label: "Pre-Workout", emoji: "⚡" },
  { id: "post_workout", label: "Post-Workout", emoji: "💪" },
  { id: "snack", label: "Snack", emoji: "🍎" },
];

export type MealLog = {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: MealType;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ai_estimated: boolean;
  created_at: string;
};

export type MacroTargets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  bmr: number;
  tdee: number;
  goal: string;
};

const ACTIVITY_MULT: Record<number, number> = {
  0: 1.2, 1: 1.2, 2: 1.375, 3: 1.375, 4: 1.55, 5: 1.55, 6: 1.725, 7: 1.9,
};

export const inferGoal = (goals: string[] | undefined): string => {
  if (!goals || goals.length === 0) return "maintain";
  const g = goals.map((s) => s.toLowerCase());
  if (g.some((s) => s.includes("muscle") || s.includes("gain"))) return "build_muscle";
  if (g.some((s) => s.includes("lose") || s.includes("weight"))) return "lose_weight";
  if (g.some((s) => s.includes("strength"))) return "gain_strength";
  if (g.some((s) => s.includes("faster") || s.includes("endurance") || s.includes("speed"))) return "performance";
  return "maintain";
};

/** Mifflin-St Jeor + goal-based macro split. Pure client calc — no AI needed. */
export const calculateTargets = (a: AthleticInfo): MacroTargets => {
  const weightKg = a.weight_lbs * 0.453592;
  const heightCm = (a.height_ft * 12 + a.height_in) * 2.54;
  const bmrRaw = a.gender === "male"
    ? 10 * weightKg + 6.25 * heightCm - 5 * a.age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * a.age - 161;
  const bmr = Math.round(bmrRaw);
  const mult = ACTIVITY_MULT[Math.max(0, Math.min(7, a.training_days_per_week))] ?? 1.55;
  const tdee = Math.round(bmr * mult);
  const goal = inferGoal(a.fitness_goals);
  const w = a.weight_lbs;

  let calories = tdee;
  let protein_g = 0, fat_g = 0, carbs_g = 0;

  if (goal === "build_muscle") {
    calories = tdee + 300;
    protein_g = Math.round(w * 1.0);
    fat_g = Math.round((calories * 0.25) / 9);
    carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);
  } else if (goal === "lose_weight") {
    calories = tdee - 400;
    protein_g = Math.round(w * 1.2);
    fat_g = Math.round((calories * 0.25) / 9);
    carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);
  } else if (goal === "performance") {
    calories = tdee;
    carbs_g = Math.round((calories * 0.5) / 4);
    protein_g = Math.round((calories * 0.25) / 4);
    fat_g = Math.round((calories * 0.25) / 9);
  } else if (goal === "gain_strength") {
    calories = tdee + 200;
    protein_g = Math.round(w * 0.9);
    fat_g = Math.round((calories * 0.28) / 9);
    carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);
  } else {
    // maintain
    calories = tdee;
    protein_g = Math.round(w * 0.8);
    fat_g = Math.round((calories * 0.27) / 9);
    carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);
  }

  return { calories, protein_g, carbs_g, fat_g, bmr, tdee, goal };
};

export const goalLabel = (g: string): string =>
  g === "build_muscle" ? "Build Muscle"
  : g === "lose_weight" ? "Lose Weight"
  : g === "performance" ? "Speed / Endurance"
  : g === "gain_strength" ? "Gain Strength"
  : "Maintain";

// ---------- Supabase helpers ----------

/** YYYY-MM-DD in the user's LOCAL timezone (not UTC). Fixes evening-log
 * entries showing up on the next day. */
export const localDateISO = (d: Date = new Date()): string =>
  d.toLocaleDateString("en-CA"); // en-CA → YYYY-MM-DD, browser's local tz

/** Backwards-compatible alias — now returns LOCAL date, not UTC. */
export const todayISO = () => localDateISO();

export const fetchMeals = async (userId: string, date: string): Promise<MealLog[]> => {
  const { data, error } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", date)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MealLog[];
};

export const fetchMealsRange = async (
  userId: string, startDate: string, endDate: string,
): Promise<MealLog[]> => {
  const { data, error } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MealLog[];
};

export const insertMeal = async (
  userId: string,
  meal: Omit<MealLog, "id" | "user_id" | "created_at">,
): Promise<MealLog> => {
  const { data, error } = await supabase
    .from("meal_logs")
    .insert({ user_id: userId, ...meal })
    .select()
    .single();
  if (error) throw error;
  return data as MealLog;
};

export const deleteMeal = async (id: string) => {
  const { error } = await supabase.from("meal_logs").delete().eq("id", id);
  if (error) throw error;
};

export type NutritionPrefs = { preferences: string; allergies: string };

export const fetchPrefs = async (userId: string): Promise<NutritionPrefs> => {
  const { data } = await supabase
    .from("nutrition_prefs")
    .select("preferences, allergies")
    .eq("user_id", userId)
    .maybeSingle();
  return { preferences: data?.preferences ?? "", allergies: data?.allergies ?? "" };
};

export const savePrefs = async (userId: string, p: NutritionPrefs) => {
  const { error } = await supabase.from("nutrition_prefs").upsert({
    user_id: userId,
    preferences: p.preferences || null,
    allergies: p.allergies || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
};

export const sumDay = (meals: MealLog[]) =>
  meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein_g: acc.protein_g + m.protein_g,
      carbs_g: acc.carbs_g + m.carbs_g,
      fat_g: acc.fat_g + m.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

/** Compute the current consecutive meal logging streak (days with at least one meal). */
export const computeStreak = (allMeals: MealLog[]): number => {
  if (allMeals.length === 0) return 0;
  const datesWithMeals = new Set(allMeals.map((m) => m.log_date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toLocaleDateString("en-CA");
    if (datesWithMeals.has(iso)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
};

export const remaining = (target: MacroTargets, totals: ReturnType<typeof sumDay>) => ({
  calories: Math.max(0, target.calories - totals.calories),
  protein_g: Math.max(0, target.protein_g - totals.protein_g),
  carbs_g: Math.max(0, target.carbs_g - totals.carbs_g),
  fat_g: Math.max(0, target.fat_g - totals.fat_g),
});