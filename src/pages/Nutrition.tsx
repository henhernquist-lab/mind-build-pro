import { useEffect, useMemo, useState } from "react";
import { Apple, Loader2, Sparkles, Plus, Trash2, ChefHat, TrendingUp, Settings2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchAthletic } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import {
  MEAL_TYPES, MealType, MealLog, MacroTargets, calculateTargets, fetchMeals, fetchMealsRange,
  insertMeal, deleteMeal, sumDay, remaining, todayISO, fetchPrefs, savePrefs, NutritionPrefs, goalLabel,
} from "@/lib/nutrition";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid } from "recharts";

const FN = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const callFn = async (name: string, body: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(FN(name), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ANON}`,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("Slow down — try again in a moment.");
    if (resp.status === 402) throw new Error("Out of AI credits.");
    throw new Error(data.error || "Request failed");
  }
  return data;
};

// ---------- Macro Ring (small SVG) ----------
const MacroRing = ({ pct, color, label, value, target, unit }: { pct: number; color: string; label: string; value: number; target: number; unit: string }) => {
  const r = 32;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, pct / 100);
  const status = pct > 110 ? "hsl(0 70% 55%)" : pct > 95 ? "hsl(45 90% 55%)" : color;
  return (
    <div className="rounded-2xl glass p-4 flex items-center gap-3">
      <div className="relative h-20 w-20 flex-shrink-0">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={r} fill="none" stroke={status} strokeWidth="6"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 600ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">
          {Math.round(pct)}%
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-bold leading-tight">{value}<span className="text-xs font-normal text-muted-foreground">/{target}{unit}</span></div>
      </div>
    </div>
  );
};

const Nutrition = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<MacroTargets | null>(null);
  const [hasProfile, setHasProfile] = useState(true);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [weekMeals, setWeekMeals] = useState<MealLog[]>([]);
  const [activeDate, setActiveDate] = useState(todayISO());

  // Meal logging
  const [mealDesc, setMealDesc] = useState("");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [estimating, setEstimating] = useState(false);

  // Prefs
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<NutritionPrefs>({ preferences: "", allergies: "" });

  // Suggestions
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [gameDayPlan, setGameDayPlan] = useState<any[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  // Weekly insight
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ath = await fetchAthletic(user.id);
      if (!ath || ath.weight_lbs <= 0 || ath.age <= 0) {
        setHasProfile(false);
        setTargets(null);
      } else {
        setHasProfile(true);
        setTargets(calculateTargets(ath));
      }
      const today = await fetchMeals(user.id, activeDate);
      setMeals(today);
      // Week range
      const end = new Date();
      const start = new Date(); start.setDate(start.getDate() - 6);
      const weekData = await fetchMealsRange(user.id, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
      setWeekMeals(weekData);
      const p = await fetchPrefs(user.id);
      setPrefs(p);
    } catch (e: any) {
      toast.error("Failed to load nutrition", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user?.id, activeDate]);

  const totals = useMemo(() => sumDay(meals), [meals]);
  const left = useMemo(() => targets ? remaining(targets, totals) : null, [targets, totals]);

  const recalc = async () => {
    if (!user) return;
    const ath = await fetchAthletic(user.id);
    if (!ath) return toast.error("No athletic profile yet");
    setTargets(calculateTargets(ath));
    setHasProfile(true);
    toast.success("Targets recalculated from your profile");
  };

  const logMeal = async () => {
    if (!user || !mealDesc.trim()) {
      toast.error("Describe what you ate");
      return;
    }
    setEstimating(true);
    try {
      const est = await callFn("estimate-meal", { description: mealDesc.trim() });
      const meal = await insertMeal(user.id, {
        log_date: activeDate,
        meal_type: mealType,
        description: est.name || mealDesc.trim().slice(0, 50),
        calories: est.calories || 0,
        protein_g: est.protein_g || 0,
        carbs_g: est.carbs_g || 0,
        fat_g: est.fat_g || 0,
        ai_estimated: true,
      });
      setMeals((prev) => [...prev, meal]);
      setWeekMeals((prev) => [...prev, meal]);
      setMealDesc("");
      toast.success(`Logged: ${meal.description}`, {
        description: `${meal.calories} kcal · ${meal.protein_g}p ${meal.carbs_g}c ${meal.fat_g}f`,
      });
    } catch (e: any) {
      toast.error("Couldn't log meal", { description: e.message });
    } finally {
      setEstimating(false);
    }
  };

  const removeMeal = async (id: string) => {
    try {
      await deleteMeal(id);
      setMeals((prev) => prev.filter((m) => m.id !== id));
      setWeekMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      toast.error("Couldn't delete meal");
    }
  };

  const askSuggestions = async () => {
    if (!targets || !left) return;
    setSuggesting(true);
    setGameDayPlan(null);
    try {
      const data = await callFn("suggest-meals", {
        remaining: left,
        goal: targets.goal,
        preferences: prefs.preferences,
        allergies: prefs.allergies,
      });
      setSuggestions(data.suggestions ?? []);
    } catch (e: any) {
      toast.error("Couldn't get suggestions", { description: e.message });
    } finally {
      setSuggesting(false);
    }
  };

  const askGameDay = async () => {
    if (!targets) return;
    setSuggesting(true);
    setSuggestions(null);
    try {
      const data = await callFn("suggest-meals", {
        mode: "game_day",
        goal: targets.goal,
        preferences: prefs.preferences,
        allergies: prefs.allergies,
      });
      setGameDayPlan(data.game_day_plan ?? []);
    } catch (e: any) {
      toast.error("Couldn't get game day plan", { description: e.message });
    } finally {
      setSuggesting(false);
    }
  };

  const askInsight = async () => {
    if (!targets) return;
    setInsightLoading(true);
    try {
      // Build day-by-day totals
      const days: { date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const dayMeals = weekMeals.filter((m) => m.log_date === iso);
        days.push({ date: iso, ...sumDay(dayMeals) });
      }
      const data = await callFn("weekly-nutrition-insight", { days, targets, goal: targets.goal });
      setInsight(data.insight);
    } catch (e: any) {
      toast.error("Couldn't generate insight", { description: e.message });
    } finally {
      setInsightLoading(false);
    }
  };

  const savePrefsHandler = async () => {
    if (!user) return;
    try {
      await savePrefs(user.id, prefs);
      toast.success("Preferences saved");
      setPrefsOpen(false);
    } catch (e: any) {
      toast.error("Couldn't save preferences");
    }
  };

  // Weekly chart data
  const weekChartData = useMemo(() => {
    const days: { day: string; date: string; calories: number; protein: number; carbs: number; fat: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayMeals = weekMeals.filter((m) => m.log_date === iso);
      const t = sumDay(dayMeals);
      days.push({
        day: d.toLocaleDateString(undefined, { weekday: "short" }),
        date: iso,
        calories: t.calories,
        protein: t.protein_g,
        carbs: t.carbs_g,
        fat: t.fat_g,
      });
    }
    return days;
  }, [weekMeals]);

  const weekAvg = useMemo(() => {
    const n = weekChartData.filter((d) => d.calories > 0).length || 1;
    return {
      cal: Math.round(weekChartData.reduce((s, d) => s + d.calories, 0) / n),
      pro: Math.round(weekChartData.reduce((s, d) => s + d.protein, 0) / n),
      carb: Math.round(weekChartData.reduce((s, d) => s + d.carbs, 0) / n),
      fat: Math.round(weekChartData.reduce((s, d) => s + d.fat, 0) / n),
    };
  }, [weekChartData]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto pb-24">
        <div className="h-32 rounded-2xl glass animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24 animate-fade-in">
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-sports/15 text-sports flex items-center justify-center">
            <Apple className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Nutrition</p>
            <h1 className="text-3xl font-bold gradient-text">Fuel Hub</h1>
            {targets && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Goal: <span className="text-foreground font-medium">{goalLabel(targets.goal)}</span> · BMR {targets.bmr} · TDEE {targets.tdee}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPrefsOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Preferences
          </Button>
          {hasProfile && (
            <Button variant="outline" size="sm" onClick={recalc}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Recalculate
            </Button>
          )}
        </div>
      </header>

      {!hasProfile && (
        <div className="mb-6 rounded-2xl glass p-5 border-l-4 border-sports flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-sports flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold">Complete your athletic profile first</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              We need your height, weight, age, training days, and goals to calculate accurate macro targets.
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/profile">Open Profile</Link>
          </Button>
        </div>
      )}

      {/* Stat Cards */}
      {targets && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MacroRing
            pct={targets.calories ? (totals.calories / targets.calories) * 100 : 0}
            color="hsl(21 95% 55%)"
            label="Calories"
            value={totals.calories}
            target={targets.calories}
            unit=""
          />
          <MacroRing
            pct={targets.protein_g ? (totals.protein_g / targets.protein_g) * 100 : 0}
            color="hsl(0 70% 60%)"
            label="Protein"
            value={totals.protein_g}
            target={targets.protein_g}
            unit="g"
          />
          <MacroRing
            pct={targets.carbs_g ? (totals.carbs_g / targets.carbs_g) * 100 : 0}
            color="hsl(40 85% 55%)"
            label="Carbs"
            value={totals.carbs_g}
            target={targets.carbs_g}
            unit="g"
          />
          <MacroRing
            pct={targets.fat_g ? (totals.fat_g / targets.fat_g) * 100 : 0}
            color="hsl(200 70% 55%)"
            label="Fat"
            value={totals.fat_g}
            target={targets.fat_g}
            unit="g"
          />
        </div>
      )}

      {/* Progress bars (more granular than rings) */}
      {targets && (
        <div className="mb-6 rounded-2xl glass p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today's Progress</h3>
            <Input
              type="date"
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
              max={todayISO()}
              className="w-auto h-7 text-xs"
            />
          </div>
          {[
            { k: "calories" as const, label: "Calories", unit: "kcal" },
            { k: "protein_g" as const, label: "Protein", unit: "g" },
            { k: "carbs_g" as const, label: "Carbs", unit: "g" },
            { k: "fat_g" as const, label: "Fat", unit: "g" },
          ].map(({ k, label, unit }) => {
            const cur = totals[k];
            const tar = targets[k];
            const pct = tar ? Math.min(100, (cur / tar) * 100) : 0;
            const over = tar > 0 && cur > tar;
            const close = pct >= 85 && !over;
            const colorCls = over ? "[&>div]:bg-destructive" : close ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500";
            return (
              <div key={k}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono">{cur}/{tar}{unit}</span>
                </div>
                <Progress value={pct} className={`h-2 ${colorCls}`} />
              </div>
            );
          })}
        </div>
      )}

      {/* Log a meal */}
      <div className="rounded-2xl glass p-5 mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Log a Meal
        </h3>
        <div className="grid md:grid-cols-[1fr_180px_auto] gap-2">
          <Input
            placeholder='e.g. "2 scrambled eggs, toast, orange juice"'
            value={mealDesc}
            onChange={(e) => setMealDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") logMeal(); }}
          />
          <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MEAL_TYPES.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.emoji} {m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={logMeal} disabled={estimating}>
            {estimating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> AI…</> : <><Sparkles className="h-4 w-4 mr-1.5" /> Estimate & log</>}
          </Button>
        </div>
      </div>

      {/* Today's meals */}
      <div className="rounded-2xl glass p-5 mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {activeDate === todayISO() ? "Today's meals" : `Meals on ${activeDate}`}
        </h3>
        {meals.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">No meals logged yet.</div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {meals.map((m) => {
                const mt = MEAL_TYPES.find((x) => x.id === m.meal_type);
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3"
                  >
                    <span className="text-xl flex-shrink-0">{mt?.emoji ?? "🍽️"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.description}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {mt?.label} · {m.calories} kcal · {m.protein_g}p {m.carbs_g}c {m.fat_g}f
                      </div>
                    </div>
                    <button
                      onClick={() => removeMeal(m.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Delete meal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* AI suggestions */}
      {targets && (
        <div className="rounded-2xl glass p-5 mb-6">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ChefHat className="h-4 w-4" /> AI Meal Suggestions
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={askSuggestions} disabled={suggesting}>
                {suggesting && !gameDayPlan ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                What should I eat?
              </Button>
              <Button size="sm" variant="premium" onClick={askGameDay} disabled={suggesting}>
                🏆 Game Day Plan
              </Button>
            </div>
          </div>

          {suggestions && suggestions.length > 0 && (
            <div className="grid md:grid-cols-3 gap-3">
              {suggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card/40 p-3"
                >
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 mb-2">{s.description}</div>
                  <div className="flex justify-between text-[11px] font-mono">
                    <span>🔥 {s.calories}</span>
                    <span className="text-red-400">{s.protein_g}p</span>
                    <span className="text-amber-400">{s.carbs_g}c</span>
                    <span className="text-blue-400">{s.fat_g}f</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {gameDayPlan && gameDayPlan.length > 0 && (
            <div className="space-y-2">
              {gameDayPlan.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-primary/30 bg-primary/5 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{p.name}</div>
                    <span className="text-[10px] uppercase tracking-wider text-primary">{p.timing}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                  <div className="flex gap-3 text-[11px] font-mono mt-1.5">
                    <span>🔥 {p.calories} kcal</span>
                    <span className="text-red-400">{p.protein_g}p</span>
                    <span className="text-amber-400">{p.carbs_g}c</span>
                    <span className="text-blue-400">{p.fat_g}f</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!suggestions && !gameDayPlan && !suggesting && (
            <div className="text-xs text-muted-foreground text-center py-3">
              Tap a button above to get personalized AI meal ideas.
            </div>
          )}
        </div>
      )}

      {/* Weekly Summary */}
      {targets && (
        <div className="rounded-2xl glass p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Weekly Nutrition Summary
          </h3>
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={targets.calories} stroke="hsl(var(--primary))" strokeDasharray="4 4" label={{ value: "Target", fill: "hsl(var(--primary))", fontSize: 10, position: "right" }} />
                <Bar dataKey="calories" fill="hsl(21 95% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Stat label="Avg cal" value={`${weekAvg.cal}`} />
            <Stat label="Avg protein" value={`${weekAvg.pro}g`} />
            <Stat label="Avg carbs" value={`${weekAvg.carb}g`} />
            <Stat label="Avg fat" value={`${weekAvg.fat}g`} />
          </div>
          <Button variant="outline" size="sm" onClick={askInsight} disabled={insightLoading} className="w-full">
            {insightLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            Generate weekly insight
          </Button>
          {insight && (
            <div className="mt-3 text-sm italic border-l-2 border-primary/40 pl-3 text-muted-foreground">
              {insight}
            </div>
          )}
        </div>
      )}

      {/* Preferences dialog */}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Food Preferences</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Preferences</Label>
              <Textarea
                rows={2}
                placeholder="e.g. vegetarian, prefer Mexican food, no seafood"
                value={prefs.preferences}
                onChange={(e) => setPrefs((p) => ({ ...p, preferences: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Allergies</Label>
              <Textarea
                rows={2}
                placeholder="e.g. peanuts, lactose, gluten"
                value={prefs.allergies}
                onChange={(e) => setPrefs((p) => ({ ...p, allergies: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={savePrefsHandler}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-muted/40 p-2 text-center">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="font-bold text-sm">{value}</div>
  </div>
);

export default Nutrition;