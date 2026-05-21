import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Camera, Upload, Info, Trash2, RotateCcw, ChevronDown, ChevronUp, Settings, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  type WaterLog, type DrinkType, type WaterGoalInfo,
  DRINK_LABELS, hydrationCredit,
  fetchWaterLogs, insertWaterLog, deleteWaterLog, sumWaterDay,
  updateWaterStreak, fetchWaterStreak, saveWaterGoal, fetchWaterGoalOverride,
  calculateWaterGoal, getLocalToday,
} from "@/lib/water";
import type { AthleticInfo } from "@/lib/profile";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const QUICK_AMOUNTS = [250, 330, 500, 1000];
const CUP_ML = 333; // ~330ml per cup icon

// ─── Scan result type ──────────────────────────────────────────────────────────
type ScanResult = {
  container_type: string;
  total_capacity_ml: number;
  fill_percentage: number;
  estimated_amount_ml: number;
  drink_type: string;
  is_water: boolean;
  confidence: "high" | "medium" | "low";
  notes: string;
};

// ─── Compress image client-side ───────────────────────────────────────────────
const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const base64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
      resolve(base64);
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });

// ─── WaterTracker ─────────────────────────────────────────────────────────────
export const WaterTracker = ({
  userId,
  date,
  athletic,
  onStreakChange,
}: {
  userId: string;
  date: string;
  athletic: AthleticInfo | null;
  onStreakChange?: (streak: number) => void;
}) => {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalInfo, setGoalInfo] = useState<WaterGoalInfo>({ goal_ml: 2000, source: "default" });
  const [customGoalInput, setCustomGoalInput] = useState("");
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [customAmountInput, setCustomAmountInput] = useState("");
  const [streak, setStreak] = useState(0);
  const [scanState, setScanState] = useState<"idle" | "preview" | "analyzing" | "result">("idle");
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanBase64, setScanBase64] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [sliderAmount, setSliderAmount] = useState(500);
  const [sliderDrinkType, setSliderDrinkType] = useState<DrinkType>("water");
  const [quickAddDisabled, setQuickAddDisabled] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInputId = "water-camera-input";
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const localToday = getLocalToday();

  // Load logs + goal on mount / date change
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetchWaterLogs(userId, localToday),
      fetchWaterGoalOverride(userId),
    ]).then(([fetchedLogs, override]) => {
      setLogs(fetchedLogs);
      const calculated = calculateWaterGoal(athletic);
      if (override && override.source === "custom") {
        setGoalInfo({ ...calculated, goal_ml: override.goal_ml, source: "custom" });
      } else {
        setGoalInfo(calculated);
      }
    }).catch((e: any) => {
      // Silently handle table-not-found (migration not run yet) — show empty state
      if (!e?.message?.includes("does not exist")) {
        toast({ title: "Couldn't load water data", description: e?.message });
      }
    }).finally(() => setLoading(false));
  }, [userId, localToday]);



  const totalMl = sumWaterDay(logs);
  const goalMl = goalInfo.goal_ml;
  const pct = Math.min(1, totalMl / goalMl);
  const goalHit = totalMl >= goalMl;
  const cupsTotal = 6;
  const cupsFilled = Math.round(pct * cupsTotal);

  // ─── Log water ──────────────────────────────────────────────────────────────
  const logWater = async (amount_ml: number, drink_type: DrinkType = "water", input_method: "manual" | "camera_scan" = "manual") => {
    const credit = hydrationCredit(amount_ml, drink_type);
    // Optimistic UI: add a temporary entry immediately so the UI updates instantly
    const tempId = `temp-${Date.now()}`;
    const optimisticLog: WaterLog = {
      id: tempId,
      user_id: userId,
      local_date: date,
      logged_at: new Date().toISOString(),
      amount_ml,
      drink_type,
      is_water: drink_type === "water",
      hydration_credit_ml: credit,
      input_method,
    };
    setLogs((prev) => [...prev, optimisticLog]);
    // Check goal before insert so we can celebrate on success
    const willHitGoal = totalMl + credit >= goalMl && totalMl < goalMl;
    try {
      const newLog = await insertWaterLog(userId, {
        local_date: date,
        logged_at: optimisticLog.logged_at,
        amount_ml,
        drink_type,
        is_water: drink_type === "water",
        hydration_credit_ml: credit,
        input_method,
        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      // Replace optimistic entry with the real persisted entry
      setLogs((prev) => prev.map((l) => l.id === tempId ? newLog : l));
      if (willHitGoal) {
        toast({ title: "🎉 Water goal hit!", description: "Amazing — you crushed your hydration goal today!" });
      }
      // Update streak server-side after successful log
      const newStreak = await updateWaterStreak(userId, goalMl);
      setStreak(newStreak);
    } catch (e: any) {
      // Rollback optimistic entry on failure
      setLogs((prev) => prev.filter((l) => l.id !== tempId));
      toast({ title: "Couldn't log water", description: e.message });
    }
  };

  const handleQuickLog = (ml: number) => {
    if (quickAddDisabled) return;
    // Debounce: disable buttons for 500ms to prevent double-tap
    setQuickAddDisabled(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuickAddDisabled(false), 500);
    logWater(ml, "water", "manual");
  };

  const handleCustomLog = () => {
    const ml = parseInt(customAmountInput);
    if (!ml || ml <= 0 || ml > 5000) {
      toast({ title: "Enter a valid amount (1–5000ml)" });
      return;
    }
    logWater(ml, "water", "manual");
    setCustomAmountInput("");
  };

  const handleUndo = async () => {
    if (logs.length === 0) return;
    const last = logs[logs.length - 1];
    try {
      await deleteWaterLog(last.id);
      setLogs((prev) => prev.slice(0, -1));
    } catch (e: any) {
      toast({ title: "Couldn't undo", description: e.message });
    }
  };

  // ─── Camera scan ────────────────────────────────────────────────────────────
  const handleFileSelected = async (file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const previewUrl = URL.createObjectURL(file);
    setScanImage(previewUrl);
    setScanState("preview");
    const base64 = await compressImage(file);
    setScanBase64(base64);
  };

  const analyzeDrink = async () => {
    if (!scanBase64) return;
    setScanState("analyzing");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token ?? ANON_KEY;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/analyze-drink`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ image: scanBase64 }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || "Analysis failed");
      }
      const result: ScanResult = await resp.json();
      setScanResult(result);
      setSliderAmount(result.estimated_amount_ml);
      setSliderDrinkType((result.drink_type as DrinkType) in DRINK_LABELS ? result.drink_type as DrinkType : "other");
      setScanState("result");
    } catch (e: any) {
      console.error('Water scan error:', e);
      toast({ title: "Scan failed", description: `Analysis failed: ${e.message}` });
      setScanState("preview");
    }
  };

  const confirmScanLog = () => {
    logWater(sliderAmount, sliderDrinkType, "camera_scan");
    setScanState("idle");
    setScanImage(null);
    setScanBase64(null);
    setScanResult(null);
  };

  const cancelScan = () => {
    setScanState("idle");
    setScanImage(null);
    setScanBase64(null);
    setScanResult(null);
  };

  // ─── Custom goal ────────────────────────────────────────────────────────────
  const saveCustomGoal = async () => {
    const ml = parseInt(customGoalInput);
    if (!ml || ml < 500 || ml > 10000) {
      toast({ title: "Enter a valid goal (500–10000ml)" });
      return;
    }
    await saveWaterGoal(userId, ml, "custom");
    setGoalInfo((prev) => ({ ...prev, goal_ml: ml, source: "custom" }));
    setShowGoalEditor(false);
    toast({ title: "Water goal updated", description: `New goal: ${ml}ml/day` });
  };

  const resetToCalculated = async () => {
    const calc = calculateWaterGoal(athletic);
    await saveWaterGoal(userId, calc.goal_ml, "calculated");
    setGoalInfo(calc);
    setShowGoalEditor(false);
    toast({ title: "Goal reset", description: `Back to calculated goal: ${calc.goal_ml}ml` });
  };

  const confidenceColor = (c?: string) =>
    c === "high" ? "bg-green-500/20 text-green-400 border-green-500/30"
    : c === "medium" ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading water tracker…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center text-lg">💧</div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">Water Intake</h3>
            <p className="text-[11px] text-muted-foreground">
              {goalInfo.source === "custom" ? "Custom goal" : goalInfo.source === "calculated" ? "Personalized goal" : "Default goal"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="text-sm font-semibold text-orange-400">🔥 {streak} day streak</span>
          )}
          <button
            onClick={() => setShowGoalEditor((v) => !v)}
            className="p-1.5 rounded-lg border border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            title="Goal settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Missing profile banner */}
      {goalInfo.missing_fields && goalInfo.missing_fields.length > 0 && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-400 flex items-center gap-2">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Add your {goalInfo.missing_fields.join(", ")} in your Athletic Profile for a personalized water goal.
          </span>
        </div>
      )}

      {/* Custom goal source note */}
      {goalInfo.source === "custom" && (
        <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
          <span>Using custom goal — calculated goal is {calculateWaterGoal(athletic).goal_ml}ml</span>
          <button onClick={resetToCalculated} className="text-primary hover:underline text-[11px] whitespace-nowrap">Reset to calculated</button>
        </div>
      )}

      {/* Goal editor */}
      {showGoalEditor && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium">Set custom daily goal</p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="e.g. 2500"
              value={customGoalInput}
              onChange={(e) => setCustomGoalInput(e.target.value)}
              className="h-8 text-sm"
            />
            <Button size="sm" className="h-8" onClick={saveCustomGoal}>Save</Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowGoalEditor(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Main display */}
      <div className="flex items-center gap-4">
        <div className="text-3xl font-bold tabular-nums text-blue-400">
          {(totalMl / 1000).toFixed(1)}L
        </div>
        <div className="text-sm text-muted-foreground">/ {(goalMl / 1000).toFixed(1)}L</div>
        {goalHit && <span className="text-green-400 font-semibold text-sm">✅ Goal hit!</span>}
      </div>

      {/* Progress bar */}
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", goalHit ? "bg-blue-400" : "bg-blue-500")}
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      {/* Cup icons */}
      <div className="flex gap-1.5">
        {Array.from({ length: cupsTotal }).map((_, i) => (
          <span key={i} className={cn("text-xl transition-all", i < cupsFilled ? "opacity-100" : "opacity-20")}>🥤</span>
        ))}
      </div>

      {/* Personalized goal breakdown */}
      {goalInfo.breakdown && (
        <div>
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {showBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            How was this calculated? ℹ️
          </button>
          {showBreakdown && (
            <div className="mt-2 rounded-lg bg-muted/30 border border-border p-3 text-xs space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground">Your daily water goal: {goalMl}ml</p>
              <p>Based on your profile:</p>
              <ul className="space-y-0.5 ml-2">
                <li>• Weight ({goalInfo.breakdown.weight_lbs} lbs) → base {goalInfo.breakdown.base_ml}ml</li>
                <li>• Height ({Math.floor(goalInfo.breakdown.height_in / 12)}'{goalInfo.breakdown.height_in % 12}") → +{goalInfo.breakdown.height_bonus_ml}ml</li>
                <li>• Age ({goalInfo.breakdown.age}) → ×{goalInfo.breakdown.age_multiplier} adjustment</li>
                <li>• Training ({goalInfo.breakdown.training_days} days/week) → +{goalInfo.breakdown.activity_bonus_ml}ml</li>
              </ul>
              <p className="italic mt-1">Staying hydrated at your activity level improves performance, focus, and recovery.</p>
            </div>
          )}
        </div>
      )}

      {/* Quick-log buttons */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Quick add</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((ml) => (
            <Button key={ml} size="sm" variant="outline" disabled={quickAddDisabled} className="h-8 text-xs border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400" onClick={() => handleQuickLog(ml)}>
              +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
            </Button>
          ))}
          <div className="flex gap-1">
            <Input
              type="number"
              placeholder="Custom ml"
              value={customAmountInput}
              onChange={(e) => setCustomAmountInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomLog()}
              className="h-8 w-24 text-xs"
            />
            <Button size="sm" className="h-8 text-xs" onClick={handleCustomLog} disabled={!customAmountInput}>Add</Button>
          </div>
        </div>
      </div>

      {/* Camera scan button */}
      <div className="flex gap-2 flex-wrap">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ opacity: 0, position: "absolute", width: 1, height: 1, overflow: "hidden" }} onChange={(e) => handleFileSelected(e.target.files?.[0])} />
        <input ref={uploadRef} type="file" accept="image/*" style={{ opacity: 0, position: "absolute", width: 1, height: 1, overflow: "hidden" }} onChange={(e) => handleFileSelected(e.target.files?.[0])} />
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => { const el = document.getElementById(cameraInputId) as HTMLInputElement | null; el?.click(); }}>
          <Camera className="h-3.5 w-3.5" /> Take Photo
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => uploadRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> Upload Photo
        </Button>
      </div>

      {/* Scan flow */}
      {scanState !== "idle" && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
          {/* Preview */}
          {(scanState === "preview" || scanState === "analyzing") && scanImage && (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden max-h-48">
                <img src={scanImage} alt="Drink preview" className="w-full object-contain max-h-48" />
                {scanState === "analyzing" && (
                  <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                    <div className="text-2xl animate-bounce">💧</div>
                    <p className="text-sm font-medium text-blue-300">Analyzing your drink…</p>
                  </div>
                )}
              </div>
              {scanState === "preview" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 text-xs bg-blue-500 hover:bg-blue-600" onClick={analyzeDrink}>
                    <Camera className="h-3.5 w-3.5 mr-1.5" /> Analyze Drink
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={cancelScan}>Cancel</Button>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {scanState === "result" && scanResult && (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">{scanResult.container_type}</p>
                  <p className="text-2xl font-bold text-blue-400">{scanResult.estimated_amount_ml}ml</p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  <span className={cn("text-[10px] border rounded-full px-2 py-0.5", DRINK_LABELS[sliderDrinkType]?.color)}>
                    {DRINK_LABELS[sliderDrinkType]?.emoji} {DRINK_LABELS[sliderDrinkType]?.label}
                  </span>
                  <span className={cn("text-[10px] border rounded-full px-2 py-0.5", confidenceColor(scanResult.confidence))}>
                    {scanResult.confidence} confidence
                  </span>
                </div>
              </div>

              {scanResult.notes && (
                <p className="text-[11px] italic text-muted-foreground">{scanResult.notes}</p>
              )}

              {/* Non-water hydration credit note */}
              {!scanResult.is_water && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-400 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    {sliderAmount}ml of {DRINK_LABELS[sliderDrinkType]?.label} = {hydrationCredit(sliderAmount, sliderDrinkType)}ml toward your water goal.{" "}
                    <span className="opacity-70">{sliderDrinkType === "sports_drink" ? "Sports drinks hydrate but not as efficiently as water." : sliderDrinkType === "coffee" || sliderDrinkType === "tea" ? "Caffeinated drinks have a diuretic effect." : "Counts partially toward hydration."}</span>
                  </span>
                </div>
              )}

              {/* Editable slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Adjust amount</p>
                  <span className="text-sm font-bold text-blue-400">{sliderAmount}ml</span>
                </div>
                <input
                  type="range"
                  min={0} max={2000} step={50}
                  value={sliderAmount}
                  onChange={(e) => setSliderAmount(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <p className="text-[10px] text-muted-foreground italic">Estimates are AI-generated based on visual analysis. Adjust the slider if the amount looks off.</p>
              </div>

              {/* Drink type selector */}
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(DRINK_LABELS) as DrinkType[]).map((dt) => (
                  <button
                    key={dt}
                    onClick={() => setSliderDrinkType(dt)}
                    className={cn(
                      "text-[10px] border rounded-full px-2 py-0.5 transition-colors",
                      sliderDrinkType === dt ? DRINK_LABELS[dt].color : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {DRINK_LABELS[dt].emoji} {DRINK_LABELS[dt].label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8 text-xs bg-blue-500 hover:bg-blue-600" onClick={confirmScanLog}>
                  <Check className="h-3.5 w-3.5 mr-1.5" /> Log {sliderAmount}ml
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={cancelScan}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's log history */}
      {logs.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Today's log</p>
            {logs.length > 0 && (
              <button
                onClick={handleUndo}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                title="Undo last entry"
              >
                <RotateCcw className="h-3 w-3" /> Undo last
              </button>
            )}
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin pr-1">
            {logs.map((log, i) => {
              const dt = DRINK_LABELS[log.drink_type] ?? DRINK_LABELS.other;
              const time = new Date(log.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={log.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-1.5 text-xs">
                  <span className="text-muted-foreground">{time}</span>
                  <span className="flex items-center gap-1">
                    {log.input_method === "camera_scan" && <Camera className="h-3 w-3 text-blue-400" />}
                    {dt.emoji} +{log.amount_ml}ml
                    {log.drink_type !== "water" && (
                      <span className="text-muted-foreground">({log.hydration_credit_ml}ml credit)</span>
                    )}
                  </span>
                  <button
                    onClick={async () => {
                      await deleteWaterLog(log.id);
                      setLogs((prev) => prev.filter((l) => l.id !== log.id));
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {logs.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">No water logged yet today. Tap a quick-add button to start!</p>
      )}
    </div>
  );
};
