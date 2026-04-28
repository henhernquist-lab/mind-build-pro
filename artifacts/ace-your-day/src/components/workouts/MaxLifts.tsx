import { useEffect, useMemo, useState } from "react";
import { Calculator, Trophy, Save, Loader2, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { calc1RM, buildPercentTable, gradeStrength, gradeColor, lbsToKg, kgToLbs, type StrengthGrade } from "@/lib/oneRepMax";
import { fetchEntries, insertEntry } from "@/lib/workouts";
import { fetchAthletic } from "@/lib/profile";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { WeightUnit } from "@/lib/athlete";

const COMMON_LIFTS = ["Bench press", "Squat", "Deadlift", "Overhead press", "Pull-ups", "Barbell row"];

type HistoryRow = {
  id: string;
  exercise: string;
  estimated_1rm_lbs: number;
  weight_used: number;
  reps_used: number;
  strength_grade: string | null;
  created_at: string;
};

export const MaxLifts = ({ weightUnit, setWeightUnit }: { weightUnit: WeightUnit; setWeightUnit: (u: WeightUnit) => void }) => {
  const { user } = useAuth();
  const [exercise, setExercise] = useState("Bench press");
  const [customEx, setCustomEx] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("5");
  const [savedExercises, setSavedExercises] = useState<string[]>([]);
  const [bodyweight, setBodyweight] = useState<number>(0);
  const [age, setAge] = useState<number>(16);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [highlightPct, setHighlightPct] = useState<number | null>(null);

  const finalEx = exercise === "__custom__" ? customEx.trim() : exercise;

  // Load athlete profile + saved exercises + history
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [ath, lifts, hist] = await Promise.all([
        fetchAthletic(user.id),
        fetchEntries(user.id, "weightlifting"),
        supabase.from("lift_max_history").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      ]);
      if (ath) {
        setBodyweight(ath.weight_lbs ?? 0);
        setAge(ath.age ?? 16);
        setGender(ath.gender ?? "male");
      }
      const exSet = new Set<string>(COMMON_LIFTS);
      lifts.forEach((e) => exSet.add(e.exercise));
      setSavedExercises(Array.from(exSet));
      if (hist.data) setHistory(hist.data as HistoryRow[]);
    })();
  }, [user?.id]);

  // Convert input weight -> lbs for calc, display in selected unit
  const weightNum = parseFloat(weight) || 0;
  const repsNum = Math.max(0, parseInt(reps) || 0);
  const weightLbs = weightUnit === "kg" ? kgToLbs(weightNum) : weightNum;
  const result = useMemo(() => calc1RM(weightLbs, repsNum), [weightLbs, repsNum]);

  const oneRmLbs = result.average;
  const displayOneRm = weightUnit === "kg" ? lbsToKg(oneRmLbs) : oneRmLbs;
  const altDisplay = weightUnit === "kg" ? `${oneRmLbs.toFixed(0)} lbs` : `${lbsToKg(oneRmLbs).toFixed(1)} kg`;

  const grading = useMemo(
    () => bodyweight > 0 && oneRmLbs > 0 ? gradeStrength(finalEx, oneRmLbs, bodyweight, age, gender) : null,
    [finalEx, oneRmLbs, bodyweight, age, gender],
  );

  const pctTable = useMemo(
    () => oneRmLbs > 0 ? buildPercentTable(weightUnit === "kg" ? lbsToKg(oneRmLbs) : oneRmLbs, weightUnit) : [],
    [oneRmLbs, weightUnit],
  );

  const exHistory = useMemo(
    () => history.filter((h) => h.exercise.toLowerCase() === finalEx.toLowerCase())
      .map((h) => ({
        date: new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        oneRm: weightUnit === "kg" ? lbsToKg(h.estimated_1rm_lbs) : h.estimated_1rm_lbs,
        id: h.id,
      })),
    [history, finalEx, weightUnit],
  );
  const allTimeBest = useMemo(
    () => history.filter((h) => h.exercise.toLowerCase() === finalEx.toLowerCase())
      .reduce<HistoryRow | null>((best, h) => (!best || h.estimated_1rm_lbs > best.estimated_1rm_lbs ? h : best), null),
    [history, finalEx],
  );

  const saveResult = async () => {
    if (!user) return;
    if (!finalEx) return toast.error("Choose an exercise");
    if (oneRmLbs <= 0) return toast.error("Enter a weight and reps first");
    setSaving(true);
    try {
      // Save to PR system as a workout entry tagged as PR
      await insertEntry(user.id, {
        sport: "weightlifting",
        exercise: finalEx,
        value: Math.round(oneRmLbs * 10) / 10,
        unit: "lbs",
        addedWeight: undefined,
        isPR: true,
        grade: undefined,
        xp: 25,
        note: `Estimated 1RM from ${weightLbs}lb × ${repsNum}`,
        breakdown: undefined,
      });
      // Save to dedicated history table
      const { data, error } = await supabase
        .from("lift_max_history")
        .insert({
          user_id: user.id,
          exercise: finalEx,
          estimated_1rm_lbs: Math.round(oneRmLbs * 10) / 10,
          weight_used: weightLbs,
          reps_used: repsNum,
          formula_avg: oneRmLbs,
          bodyweight_lbs: bodyweight || null,
          strength_grade: grading?.grade ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      setHistory((prev) => [...prev, data as HistoryRow]);
      toast.success(`🏆 Saved ${finalEx} 1RM as a PR`);
    } catch (e: any) {
      toast.error("Couldn't save", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const unitLabel = weightUnit;

  return (
    <div className="space-y-6">
      {/* Calculator card */}
      <div className="rounded-2xl glass p-5">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4" /> 1 Rep Max Calculator
          </h3>
          <div className="inline-flex rounded-full border border-border p-0.5 text-[10px] font-semibold">
            {(["lbs", "kg"] as WeightUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setWeightUnit(u)}
                className={cn(
                  "px-3 py-0.5 rounded-full transition-colors uppercase",
                  weightUnit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div>
            <Label className="text-[11px] text-muted-foreground">Exercise</Label>
            <Select value={exercise} onValueChange={setExercise}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {savedExercises.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                <SelectItem value="__custom__">➕ Custom…</SelectItem>
              </SelectContent>
            </Select>
            {exercise === "__custom__" && (
              <Input className="mt-1.5" value={customEx} onChange={(e) => setCustomEx(e.target.value)} placeholder="e.g. Trap bar deadlift" />
            )}
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Weight ({unitLabel})</Label>
            <Input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Reps</Label>
            <Input type="number" min={1} max={20} value={reps} onChange={(e) => setReps(e.target.value)} />
          </div>
        </div>

        {oneRmLbs > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Hero result */}
            <div className="rounded-xl bg-gradient-to-br from-sports/15 to-primary/15 p-5 text-center border border-sports/30">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Estimated 1RM</div>
              <div className="text-5xl font-bold mt-1 gradient-text">{displayOneRm.toFixed(1)}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-1">{unitLabel.toUpperCase()} · {altDisplay}</div>
              <div className="text-[10px] text-muted-foreground mt-2">{finalEx} · {weight || 0}{unitLabel} × {repsNum} reps</div>
            </div>

            {/* Formula breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Epley", val: result.epley },
                { label: "Brzycki", val: result.brzycki },
                { label: "Lombardi", val: result.lombardi },
                { label: "O'Connor", val: result.oconnor },
              ].map((f) => {
                const v = weightUnit === "kg" ? lbsToKg(f.val) : f.val;
                return (
                  <div key={f.label} className="rounded-lg border border-border bg-card/40 p-2.5 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
                    <div className="font-bold text-base mt-0.5">{v.toFixed(1)}</div>
                  </div>
                );
              })}
            </div>

            <Button onClick={saveResult} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save to PRs
            </Button>
          </motion.div>
        )}
      </div>

      {/* Strength grading */}
      {grading && oneRmLbs > 0 && (
        <div className="rounded-2xl glass p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Strength Grade</h3>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
              style={{ background: `${gradeColor(grading.grade)}22`, color: gradeColor(grading.grade), border: `1px solid ${gradeColor(grading.grade)}55` }}
            >
              {grading.grade}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            Lift-to-bodyweight ratio: <span className="font-mono text-foreground">{grading.ratio}×</span>
            {bodyweight > 0 && <> · {bodyweight}lb athlete, age {age}</>}
          </div>
          {/* Spectrum bar */}
          <div className="relative h-3 rounded-full bg-muted overflow-hidden mb-2">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-500 via-emerald-500 to-purple-500 opacity-60" />
            <div
              className="absolute top-0 bottom-0 w-1 bg-foreground shadow-lg"
              style={{ left: `${grading.position * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-5 text-[9px] uppercase tracking-wider text-muted-foreground">
            {(["Beginner", "Novice", "Intermediate", "Advanced", "Elite"] as StrengthGrade[]).map((g) => (
              <span key={g} className="text-center">{g}</span>
            ))}
          </div>
          <div className="text-xs italic mt-3 border-l-2 border-primary/40 pl-3 text-muted-foreground">
            {grading.note}
          </div>
        </div>
      )}

      {/* Percentage table */}
      {pctTable.length > 0 && (
        <div className="rounded-2xl glass p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Lift Percentage Table
          </h3>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">% of 1RM</th>
                  <th className="text-left px-3 py-2">Weight</th>
                  <th className="text-left px-3 py-2">Best for</th>
                </tr>
              </thead>
              <tbody>
                {pctTable.map((row) => {
                  const active = highlightPct === row.pct;
                  return (
                    <tr
                      key={row.pct}
                      onClick={() => setHighlightPct(active ? null : row.pct)}
                      className={cn(
                        "cursor-pointer transition-colors border-t border-border",
                        active ? "bg-primary/15" : "hover:bg-muted/30",
                      )}
                    >
                      <td className="px-3 py-2 font-mono font-semibold">{row.pct}%</td>
                      <td className="px-3 py-2 font-bold">{row.weight} {unitLabel}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History chart */}
      {exHistory.length > 0 && (
        <div className="rounded-2xl glass p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <HistoryIcon className="h-4 w-4" /> {finalEx} progression
            </h3>
            {allTimeBest && (
              <span className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Trophy className="h-3 w-3" /> All-time best:{" "}
                {weightUnit === "kg" ? lbsToKg(allTimeBest.estimated_1rm_lbs).toFixed(1) : allTimeBest.estimated_1rm_lbs.toFixed(1)} {unitLabel}
              </span>
            )}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={exHistory} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="oneRm" stroke="hsl(var(--sports))" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};