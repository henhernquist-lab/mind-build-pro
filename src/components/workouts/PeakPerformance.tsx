import { useMemo, useState } from "react";
import { Sparkles, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Entry } from "@/lib/workouts";

const FN = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

export type TimeSlot =
  | "Early Morning (5-9am)"
  | "Morning (9am-12pm)"
  | "Early Afternoon (12-3pm)"
  | "Late Afternoon (3-6pm)"
  | "Evening (6-9pm)"
  | "Night (9pm-5am)";

const TIME_SLOTS: TimeSlot[] = [
  "Early Morning (5-9am)",
  "Morning (9am-12pm)",
  "Early Afternoon (12-3pm)",
  "Late Afternoon (3-6pm)",
  "Evening (6-9pm)",
  "Night (9pm-5am)",
];

const TIME_SLOT_COLORS: Record<TimeSlot, string> = {
  "Early Morning (5-9am)": "hsl(200 80% 55%)",
  "Morning (9am-12pm)": "hsl(45 90% 55%)",
  "Early Afternoon (12-3pm)": "hsl(30 90% 55%)",
  "Late Afternoon (3-6pm)": "hsl(142 70% 50%)",
  "Evening (6-9pm)": "hsl(270 70% 60%)",
  "Night (9pm-5am)": "hsl(220 60% 50%)",
};

export const getTimeSlot = (loggedAt: string): TimeSlot => {
  const hour = new Date(loggedAt).getHours();
  if (hour >= 5 && hour < 9) return "Early Morning (5-9am)";
  if (hour >= 9 && hour < 12) return "Morning (9am-12pm)";
  if (hour >= 12 && hour < 15) return "Early Afternoon (12-3pm)";
  if (hour >= 15 && hour < 18) return "Late Afternoon (3-6pm)";
  if (hour >= 18 && hour < 21) return "Evening (6-9pm)";
  return "Night (9pm-5am)";
};

type ExerciseSlotData = {
  exercise: string;
  slotData: Record<TimeSlot, { values: number[]; avg: number; count: number }>;
  bestSlot: TimeSlot;
  bestAvg: number;
  unit: string;
  lowerIsBetter: boolean;
};

const isSpeedExercise = (ex: string) => {
  const k = ex.toLowerCase();
  return k.includes("40") || k.includes("100m") || k.includes("mile") || k.includes("shuttle") || k.includes("sprint");
};

export const PeakPerformance = ({
  allEntries,
  sport,
}: {
  allEntries: Entry[];
  sport: string;
}) => {
  const { user } = useAuth();
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const MIN_LOGS = 20;
  const MIN_SLOTS = 3;

  // Compute per-exercise time-slot averages
  const exerciseData = useMemo((): ExerciseSlotData[] => {
    const byExercise: Record<string, { entries: Entry[]; lowerIsBetter: boolean }> = {};
    for (const e of allEntries) {
      if (!e.loggedAt) continue;
      if (!byExercise[e.exercise]) {
        byExercise[e.exercise] = { entries: [], lowerIsBetter: isSpeedExercise(e.exercise) };
      }
      byExercise[e.exercise].entries.push(e);
    }

    const result: ExerciseSlotData[] = [];
    for (const [exercise, { entries, lowerIsBetter }] of Object.entries(byExercise)) {
      if (entries.length < 5) continue;

      const slotData: Record<TimeSlot, { values: number[]; avg: number; count: number }> = {} as any;
      for (const slot of TIME_SLOTS) {
        slotData[slot] = { values: [], avg: 0, count: 0 };
      }

      for (const e of entries) {
        const slot = getTimeSlot(e.loggedAt);
        slotData[slot].values.push(e.value);
      }

      const usedSlots: TimeSlot[] = [];
      for (const slot of TIME_SLOTS) {
        const vals = slotData[slot].values;
        if (vals.length > 0) {
          slotData[slot].avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          slotData[slot].count = vals.length;
          usedSlots.push(slot);
        }
      }

      if (usedSlots.length < 2) continue;

      const bestSlot = usedSlots.reduce((best, slot) => {
        const bestAvg = slotData[best].avg;
        const curAvg = slotData[slot].avg;
        return lowerIsBetter ? (curAvg < bestAvg ? slot : best) : (curAvg > bestAvg ? slot : best);
      });

      result.push({
        exercise,
        slotData,
        bestSlot,
        bestAvg: slotData[bestSlot].avg,
        unit: lowerIsBetter ? "s" : "lbs",
        lowerIsBetter,
      });
    }
    return result;
  }, [allEntries]);

  // Overall peak window
  const overallPeak = useMemo(() => {
    if (exerciseData.length === 0) return null;
    const slotScores: Record<string, number> = {};
    for (const ex of exerciseData) {
      for (const slot of TIME_SLOTS) {
        if (ex.slotData[slot].count === 0) continue;
        if (!slotScores[slot]) slotScores[slot] = 0;
        // Normalize: how much better than average?
        const allAvgs = TIME_SLOTS.filter((s) => ex.slotData[s].count > 0).map((s) => ex.slotData[s].avg);
        const mean = allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length;
        const slotAvg = ex.slotData[slot as TimeSlot].avg;
        const delta = ex.lowerIsBetter ? (mean - slotAvg) / mean : (slotAvg - mean) / mean;
        slotScores[slot] = (slotScores[slot] ?? 0) + delta;
      }
    }
    const best = Object.entries(slotScores).reduce<[string, number] | null>((b, [s, v]) => (!b || v > b[1] ? [s, v] : b), null);
    if (!best) return null;
    const pctBetter = Math.round(Math.abs(best[1] / exerciseData.length) * 100);
    return { slot: best[0] as TimeSlot, pctBetter };
  }, [exerciseData]);

  const totalLogs = allEntries.length;
  const usedSlots = new Set(allEntries.filter((e) => e.loggedAt).map((e) => getTimeSlot(e.loggedAt))).size;
  const hasEnoughData = totalLogs >= MIN_LOGS && usedSlots >= MIN_SLOTS;

  const fetchInsight = async () => {
    if (!user || !overallPeak) return;
    setInsightLoading(true);
    setInsight(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const worst = exerciseData.length > 0
        ? TIME_SLOTS.find((s) => exerciseData.some((e) => e.slotData[s].count > 0) && s !== overallPeak.slot) ?? "Morning (9am-12pm)"
        : "Morning (9am-12pm)";
      const prompt = `This student athlete logs their best performances during ${overallPeak.slot}. Their sport is ${sport || "general sport"}. Their worst performance window is ${worst}. Write 2-3 sentences of coaching insight about their performance patterns and one specific actionable recommendation about when to schedule their hardest training sessions. Be specific and practical.`;
      const resp = await fetch(FN("ace-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], userId: user.id }),
      });
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      let note = "";
      for (const line of text.split("\n")) {
        if (line.startsWith("data: ")) {
          try { const d = JSON.parse(line.slice(6)); if (d.content) note += d.content; } catch { /* skip */ }
        }
      }
      setInsight(note.trim() || "Keep logging workouts to unlock personalized coaching insights.");
    } catch {
      setInsight("Keep logging workouts to unlock personalized coaching insights.");
    } finally {
      setInsightLoading(false);
    }
  };

  if (!hasEnoughData) {
    const remaining = Math.max(0, MIN_LOGS - totalLogs);
    const pct = Math.min(100, (totalLogs / MIN_LOGS) * 100);
    return (
      <div className="rounded-2xl glass p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-400" /> Peak Performance
        </h3>
        <div className="text-sm text-muted-foreground mb-3">
          Log <span className="font-bold text-foreground">{remaining}</span> more workouts across different times to unlock your Peak Performance analysis.
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">{totalLogs}/{MIN_LOGS} logs · {usedSlots}/{MIN_SLOTS} time slots</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl glass p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-400" /> Peak Performance
      </h3>

      {/* Overall peak window */}
      {overallPeak && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 mb-5 flex items-center gap-4">
          <Star className="h-8 w-8 text-amber-400 flex-shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your Peak Training Window</div>
            <div className="text-lg font-bold">{overallPeak.slot}</div>
            <div className="text-xs text-muted-foreground">
              You perform <span className="font-bold text-amber-400">{overallPeak.pctBetter}% better</span> during this window across all logged exercises
            </div>
          </div>
        </div>
      )}

      {/* Per-exercise bars */}
      <div className="space-y-5 mb-4">
        {exerciseData.map((ex) => {
          const maxAvg = Math.max(...TIME_SLOTS.map((s) => ex.slotData[s].avg));
          const minAvg = Math.min(...TIME_SLOTS.filter((s) => ex.slotData[s].count > 0).map((s) => ex.slotData[s].avg));
          const range = maxAvg - minAvg || 1;

          return (
            <div key={ex.exercise}>
              <div className="text-xs font-semibold mb-2">{ex.exercise}</div>
              <div className="space-y-1.5">
                {TIME_SLOTS.filter((s) => ex.slotData[s].count > 0).map((slot) => {
                  const avg = ex.slotData[slot].avg;
                  const isBest = slot === ex.bestSlot;
                  const barPct = ex.lowerIsBetter
                    ? ((maxAvg - avg) / range) * 100
                    : ((avg - minAvg) / range) * 100;
                  return (
                    <div key={slot} className="flex items-center gap-2">
                      <div className="w-36 text-[10px] text-muted-foreground truncate flex-shrink-0">{slot.split(" (")[0]}</div>
                      <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(4, barPct)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: isBest ? "hsl(45 90% 55%)" : TIME_SLOT_COLORS[slot] }}
                        />
                      </div>
                      <div className={cn("text-[10px] w-16 text-right font-mono flex-shrink-0", isBest && "text-amber-400 font-bold")}>
                        {avg.toFixed(1)}{ex.unit} {isBest && "⭐"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Claude insight */}
      <Button variant="outline" size="sm" onClick={fetchInsight} disabled={insightLoading} className="w-full mb-3">
        {insightLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
        Get coaching insight
      </Button>
      {insight && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-primary/8 border border-primary/20 px-3 py-2.5 text-sm italic text-foreground/90"
        >
          💬 {insight}
        </motion.div>
      )}
    </div>
  );
};
