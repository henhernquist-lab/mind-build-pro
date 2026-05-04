import { useEffect, useMemo, useRef, useState } from "react";
import { Apple, Loader2, Sparkles, Plus, Trash2, ChefHat, TrendingUp, Settings2, AlertCircle, Camera, Upload, X, ScanLine, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { WaterTracker } from "@/components/nutrition/WaterTracker";
import { DayDetailDrawer } from "@/components/nutrition/DayDetailDrawer";
import { calculateWaterGoal, fetchWaterGoalOverride } from "@/lib/water";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
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
import { fetchAthletic, type AthleticInfo } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import {
  MEAL_TYPES, MealType, MealLog, MacroTargets, calculateTargets, fetchMeals, fetchMealsRange,
  insertMeal, deleteMeal, sumDay, remaining, todayISO, fetchPrefs, savePrefs, NutritionPrefs, goalLabel, computeStreak,
} from "@/lib/nutrition";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid, Cell } from "recharts";
import { cn } from "@/lib/utils";

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

// ---------- Week Calendar Strip ----------
const WeekStrip = ({
  activeDate,
  weekStart,
  weekMeals,
  targets,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onToday,
}: {
  activeDate: string;
  weekStart: Date;
  weekMeals: MealLog[];
  targets: MacroTargets | null;
  onSelectDate: (d: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}) => {
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getDotColor = (iso: string) => {
    const dayMeals = weekMeals.filter((m) => m.log_date === iso);
    if (dayMeals.length === 0) return null;
    if (!targets) return "bg-muted-foreground";
    const t = sumDay(dayMeals);
    const calPct = t.calories / targets.calories;
    if (calPct >= 0.9 && calPct <= 1.1) return "bg-emerald-500";
    if (calPct >= 0.7) return "bg-amber-500";
    return "bg-muted-foreground";
  };

  const isNextWeekDisabled = () => {
    const nextMonday = new Date(weekStart);
    nextMonday.setDate(nextMonday.getDate() + 7);
    return nextMonday.toLocaleDateString("en-CA") > today;
  };

  return (
    <div className="rounded-2xl glass p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button onClick={onPrevWeek} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={onNextWeek} disabled={isNextWeekDisabled()} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={onToday}
          className="text-xs font-medium text-primary hover:underline"
        >
          Today
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const iso = d.toLocaleDateString("en-CA");
          const isActive = iso === activeDate;
          const isToday = iso === today;
          const dotColor = getDotColor(iso);
          const isFuture = iso > today;
          return (
            <button
              key={iso}
              onClick={() => !isFuture && onSelectDate(iso)}
              disabled={isFuture}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/60",
                isToday && !isActive ? "ring-2 ring-primary/40" : "",
                isFuture ? "opacity-30 cursor-not-allowed" : ""
              )}
            >
              <span className="text-[10px] font-medium uppercase">
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className="text-sm font-bold">{d.getDate()}</span>
              <div className={cn("h-1.5 w-1.5 rounded-full transition-colors", dotColor ?? "opacity-0", dotColor ?? "")} />
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 justify-center text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />Goal hit</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />Partial</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground inline-block" />Logged</span>
      </div>
    </div>
  );
};

const Nutrition = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<MacroTargets | null>(null);
  const [hasProfile, setHasProfile] = useState(true);
  const [athletic, setAthletic] = useState<AthleticInfo | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [weekMeals, setWeekMeals] = useState<MealLog[]>([]);
  const [activeDate, setActiveDate] = useState(todayISO());
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [streak, setStreak] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(2000);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetailDate, setDayDetailDate] = useState(todayISO());

  // Meal logging
  const [mealDesc, setMealDesc] = useState("");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [estimating, setEstimating] = useState(false);
  const online = useOnlineStatus();

  // Scan a meal (camera / upload)
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanMediaType, setScanMediaType] = useState<string>("image/jpeg");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    meal_name: string; items: string[]; calories: number; protein_g: number;
    carbs_g: number; fat_g: number; confidence: "high" | "medium" | "low" | string; notes?: string;
  } | null>(null);
  const [scanMealType, setScanMealType] = useState<MealType>("lunch");

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

  const getWeekRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      startISO: start.toLocaleDateString("en-CA"),
      endISO: end.toLocaleDateString("en-CA"),
    };
  };

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ath = await fetchAthletic(user.id);
      setAthletic(ath);
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
      const { startISO, endISO } = getWeekRange(weekStart);
      const weekData = await fetchMealsRange(user.id, startISO, endISO);
      setWeekMeals(weekData);
      // Streak: fetch last 60 days
      const streakStart = new Date(); streakStart.setDate(streakStart.getDate() - 60);
      const streakData = await fetchMealsRange(user.id, streakStart.toLocaleDateString("en-CA"), todayISO());
      setStreak(computeStreak(streakData));
      const p = await fetchPrefs(user.id);
      setPrefs(p);
      // Water goal
      const override = await fetchWaterGoalOverride(user.id);
      if (override) {
        setWaterGoalMl(override.goal_ml);
      } else if (ath) {
        const { goal_ml } = calculateWaterGoal(ath);
        setWaterGoalMl(goal_ml);
      }
    } catch (e: any) {
      toast.error("Failed to load nutrition", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user?.id, activeDate, weekStart]);

  const totals = useMemo(() => sumDay(meals), [meals]);
  const left = useMemo(() => targets ? remaining(targets, totals) : null, [targets, totals]);

  const handlePrevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleToday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    setWeekStart(d);
    setActiveDate(todayISO());
  };

  // ---- Scan helpers ----
  const compressImage = (file: File, maxDim = 1280, quality = 0.85): Promise<{ dataUrl: string; mediaType: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas unavailable"));
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve({ dataUrl, mediaType: "image/jpeg" });
        };
        img.onerror = () => reject(new Error("Could not read image"));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });

  const handleScanFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    setScanResult(null);
    try {
      const { dataUrl, mediaType } = await compressImage(file);
      setScanPreview(dataUrl);
      setScanMediaType(mediaType);
    } catch (e: any) {
      toast.error("Couldn't load photo", { description: e.message });
    }
  };

  const clearScan = () => {
    setScanPreview(null);
    setScanResult(null);
    setScanning(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  };

  const analyzeScan = async () => {
    if (!scanPreview) return;
    setScanning(true);
    setScanResult(null);
    try {
      const base64 = scanPreview.includes(",") ? scanPreview.split(",")[1] : scanPreview;
      const data = await callFn("scan-meal-image", {
        image_data: base64,
        media_type: scanMediaType,
      });
      if (data?.error === "no_food") {
        toast.error("No food detected. Try a clearer photo of your meal");
        return;
      }
      if (!data || typeof data.calories !== "number") {
        toast.error("Couldn't read that photo", { description: "Try a clearer shot of your meal" });
        return;
      }
      setScanResult({
        meal_name: String(data.meal_name ?? "Scanned meal").slice(0, 60),
        items: Array.isArray(data.items) ? data.items.map(String) : [],
        calories: Math.max(0, Math.round(Number(data.calories) || 0)),
        protein_g: Math.max(0, Math.round(Number(data.protein_g) || 0)),
        carbs_g: Math.max(0, Math.round(Number(data.carbs_g) || 0)),
        fat_g: Math.max(0, Math.round(Number(data.fat_g) || 0)),
        confidence: (data.confidence ?? "medium"),
        notes: data.notes ? String(data.notes) : undefined,
      });
    } catch (e: any) {
      toast.error("Scan failed", { description: e.message });
    } finally {
      setScanning(false);
    }
  };

  const addScanToLog = async () => {
    if (!user || !scanResult) return;
    try {
      const meal = await insertMeal(user.id, {
        log_date: activeDate,
        meal_type: scanMealType,
        description: scanResult.meal_name || "Scanned meal",
        calories: scanResult.calories,
        protein_g: scanResult.protein_g,
        carbs_g: scanResult.carbs_g,
        fat_g: scanResult.fat_g,
        ai_estimated: true,
      });
      setMeals((prev) => [...prev, meal]);
      setWeekMeals((prev) => [...prev, meal]);
      toast.success(`Logged: ${meal.description}`, {
        description: `${meal.calories} kcal · ${meal.protein_g}p ${meal.carbs_g}c ${meal.fat_g}f`,
      });
      clearScan();
    } catch (e: any) {
      toast.error("Couldn't add to log", { description: e.message });
    }
  };

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
      const { startISO, endISO } = getWeekRange(weekStart);
      const days: { date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart); d.setDate(d.getDate() + i);
        const iso = d.toLocaleDateString("en-CA");
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
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart); d.setDate(d.getDate() + i);
      const iso = d.toLocaleDateString("en-CA");
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
  }, [weekMeals, weekStart]);

  const weekAvg = useMemo(() => {
    const n = weekChartData.filter((d) => d.calories > 0).length || 1;
    return {
      cal: Math.round(weekChartData.reduce((s, d) => s + d.calories, 0) / n),
      pro: Math.round(weekChartData.reduce((s, d) => s + d.protein, 0) / n),
      carb: Math.round(weekChartData.reduce((s, d) => s + d.carbs, 0) / n),
      fat: Math.round(weekChartData.reduce((s, d) => s + d.fat, 0) / n),
    };
  }, [weekChartData]);

  const getBarColor = (calories: number) => {
    if (!targets) return "hsl(21 95% 55%)";
    const pct = calories / targets.calories;
    if (pct >= 0.9 && pct <= 1.1) return "hsl(145 70% 50%)";
    if (pct < 0.9) return "hsl(45 90% 55%)";
    return "hsl(0 70% 55%)";
  };

  const isPastDay = activeDate < todayISO();

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
        <div className="flex items-center gap-2">
          {/* Streak Counter */}
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/15 text-orange-500 text-sm font-bold border border-orange-500/30">
              <Flame className="h-4 w-4" />
              {streak} day streak
            </div>
          )}
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

      {/* Week Calendar Strip */}
      <WeekStrip
        activeDate={activeDate}
        weekStart={weekStart}
        weekMeals={weekMeals}
        targets={targets}
        onSelectDate={(d) => {
          setActiveDate(d);
          setDayDetailDate(d);
          setDayDetailOpen(true);
        }}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
      />

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

      {/* Water Tracker */}
      {user && (
        <div className="mb-6">
          <WaterTracker
            userId={user.id}
            date={activeDate}
            athletic={athletic}
          />
        </div>
      )}

      {/* Daily Summary Progress Bars */}
      {targets && (
        <div className="mb-6 rounded-2xl glass p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {activeDate === todayISO() ? "Today's Progress" : `${isPastDay ? "Summary for" : "Progress for"} ${new Date(activeDate + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
            </h3>
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

      {/* Log a meal (only for today or past dates) */}
      {activeDate <= todayISO() && (
        <div className="rounded-2xl glass p-5 mb-6">
          {/* Scan Your Meal */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Camera className="h-4 w-4" /> Scan Your Meal
            </h3>

            {!scanPreview && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleScanFile(e.target.files?.[0])}
                />
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleScanFile(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="premium"
                  className="h-20 text-base flex-col gap-1"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={!online}
                  title={!online ? "Camera scan requires an internet connection" : undefined}
                >
                  <Camera className="h-6 w-6" />
                  <span>{online ? "📷 Take Photo" : "📷 Photo (offline)"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-20 text-base flex-col gap-1"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={!online}
                  title={!online ? "Upload scan requires an internet connection" : undefined}
                >
                  <Upload className="h-6 w-6" />
                  <span>Upload Photo</span>
                </Button>
              </div>
            )}

            {scanPreview && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-border/60">
                  <img src={scanPreview} alt="Meal preview" className="w-full max-h-80 object-cover" />
                  <button
                    type="button"
                    onClick={clearScan}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <AnimatePresence>
                    {scanning && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-background/55 backdrop-blur-sm"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                          className="h-16 w-16 rounded-full bg-sports/20 flex items-center justify-center mb-3"
                        >
                          <ScanLine className="h-8 w-8 text-sports" />
                        </motion.div>
                        <div className="text-sm font-semibold">🔍 Analyzing your meal...</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {!scanResult && (
                  <Button onClick={analyzeScan} disabled={scanning} className="w-full">
                    {scanning ? (
                      <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Analyzing…</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-1.5" /> Analyze Meal</>
                    )}
                  </Button>
                )}

                {scanResult && (
                  <div className="rounded-2xl border border-border/60 p-4 space-y-3 animate-fade-in">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="font-semibold text-base">{scanResult.meal_name}</div>
                      <span
                        className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
                          scanResult.confidence === "high"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : scanResult.confidence === "medium"
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {scanResult.confidence} confidence
                      </span>
                    </div>

                    {scanResult.items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {scanResult.items.map((it, i) => (
                          <span key={`${it}-${i}`} className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground/80">
                            {it}
                          </span>
                        ))}
                      </div>
                    )}

                    {scanResult.notes && (
                      <div className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
                        {scanResult.notes}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</Label>
                        <Input value={scanResult.meal_name} onChange={(e) => setScanResult({ ...scanResult, meal_name: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Meal type</Label>
                        <Select value={scanMealType} onValueChange={(v) => setScanMealType(v as MealType)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MEAL_TYPES.map((m) => <SelectItem key={m.id} value={m.id}>{m.emoji} {m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Calories</Label>
                        <Input type="number" value={scanResult.calories} onChange={(e) => setScanResult({ ...scanResult, calories: Math.max(0, Number(e.target.value) || 0) })} />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Protein (g)</Label>
                        <Input type="number" value={scanResult.protein_g} onChange={(e) => setScanResult({ ...scanResult, protein_g: Math.max(0, Number(e.target.value) || 0) })} />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Carbs (g)</Label>
                        <Input type="number" value={scanResult.carbs_g} onChange={(e) => setScanResult({ ...scanResult, carbs_g: Math.max(0, Number(e.target.value) || 0) })} />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fat (g)</Label>
                        <Input type="number" value={scanResult.fat_g} onChange={(e) => setScanResult({ ...scanResult, fat_g: Math.max(0, Number(e.target.value) || 0) })} />
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground">
                      Macro estimates are AI-generated approximations. Adjust values as needed for accuracy.
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={addScanToLog} className="flex-1">
                        <Plus className="h-4 w-4 mr-1.5" /> Add to Log
                      </Button>
                      <Button variant="outline" onClick={clearScan}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="my-5 h-px bg-border/60" />
          </div>

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
                {MEAL_TYPES.map((m) => <SelectItem key={m.id} value={m.id}>{m.emoji} {m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={logMeal} disabled={estimating}>
              {estimating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> AI…</> : <><Sparkles className="h-4 w-4 mr-1.5" /> Estimate & log</>}
            </Button>
          </div>
        </div>
      )}

      {/* Meals for selected day */}
      <div className="rounded-2xl glass p-5 mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {activeDate === todayISO() ? "Today's Meals" : `Meals on ${new Date(activeDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`}
        </h3>
        {meals.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">No meals logged {isPastDay ? "on this day" : "yet"}.</div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {meals.map((m) => {
                const mt = MEAL_TYPES.find((x) => x.id === m.meal_type);
                const logTime = new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-3"
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">{mt?.emoji ?? "🍽️"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {mt?.label}
                        </span>
                        {m.ai_estimated && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">📷 AI</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{logTime}</span>
                      </div>
                      <div className="text-sm font-medium truncate mt-0.5">{m.description}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-medium">🔵 {m.calories}kcal</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">🟠 {m.protein_g}g protein</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">🟢 {m.carbs_g}g carbs</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">🟡 {m.fat_g}g fat</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeMeal(m.id)}
                      className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"
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
      {targets && activeDate === todayISO() && (
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
                <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                  {weekChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.calories)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Color legend */}
          <div className="flex gap-3 mb-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500 inline-block" />On target (±10%)</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-500 inline-block" />Under target</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-500 inline-block" />Over target</span>
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

      {/* Day Detail Drawer */}
      {user && (
        <DayDetailDrawer
          open={dayDetailOpen}
          date={dayDetailDate}
          userId={user.id}
          targets={targets}
          waterGoalMl={waterGoalMl}
          onClose={() => setDayDetailOpen(false)}
          onDateChange={(d) => {
            setDayDetailDate(d);
            setActiveDate(d);
          }}
          onMealDeleted={(id) => {
            setMeals((prev) => prev.filter((m) => m.id !== id));
            setWeekMeals((prev) => prev.filter((m) => m.id !== id));
          }}
          onLogMealForDate={(d) => {
            setActiveDate(d);
            setDayDetailOpen(false);
          }}
        />
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
