import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

const FN = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

type ScoreRow = {
  id: string;
  week_start_date: string;
  workout_score: number;
  study_score: number;
  nutrition_score: number;
  water_score: number;
  total_score: number;
  xp_awarded: number;
};

const scoreColor = (s: number) =>
  s >= 86 ? "hsl(45 90% 55%)" : s >= 66 ? "hsl(142 70% 50%)" : s >= 41 ? "hsl(38 90% 55%)" : "hsl(0 70% 55%)";

const scoreGrade = (s: number) =>
  s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "F";

const weekLabel = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const RingChart = ({ score, size = 120 }: { score: number; size?: number }) => {
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  const color = scoreColor(score);
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ}` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>{score}</text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>{scoreGrade(score)}</text>
    </svg>
  );
};

const MiniBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-24 text-xs text-muted-foreground truncate">{label}</div>
    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${(value / max) * 100}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
    <div className="text-xs font-mono w-10 text-right">{value.toFixed(0)}/{max}</div>
  </div>
);

export const ConsistencyScore = ({ compact = false }: { compact?: boolean }) => {
  const { user } = useAuth();
  const [current, setCurrent] = useState<ScoreRow | null>(null);
  const [history, setHistory] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [coachNote, setCoachNote] = useState<string | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);

  const thisWeekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Sunday
    return d.toISOString().slice(0, 10);
  })();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("consistency_scores" as any)
        .select("*")
        .eq("student_id", user.id)
        .order("week_start_date", { ascending: false })
        .limit(7);
      const rows = (data ?? []) as unknown as ScoreRow[];
      setHistory(rows);
      const cur = rows.find((r) => r.week_start_date === thisWeekStart);
      setCurrent(cur ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  const calculateScore = async () => {
    if (!user) return;
    setCalculating(true);
    try {
      // Fetch data for past 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const since = sevenDaysAgo.toISOString();

      const results = await Promise.all([
        supabase.from("workout_logs").select("logged_at").eq("user_id", user.id).gte("logged_at", since),
        supabase.from("running_logs" as any).select("logged_at").eq("user_id", user.id).gte("logged_at", since),
        supabase.from("tutor_messages" as any).select("created_at").eq("user_id", user.id).gte("created_at", since),
        supabase.from("practice_attempts" as any).select("created_at").eq("user_id", user.id).gte("created_at", since),
        supabase.from("meal_logs").select("logged_at,calories,protein,carbs,fat").eq("user_id", user.id).gte("logged_at", since),
        supabase.from("water_logs").select("logged_at,amount_ml").eq("user_id", user.id).gte("logged_at", since),
        supabase.from("athletic_profiles" as any).select("training_days_per_week").eq("user_id" as any, user.id).maybeSingle(),
        supabase.from("user_water_goals" as any).select("goal_ml").eq("user_id" as any, user.id).maybeSingle(),
      ] as const) as any[];
      const wlogs = results[0].data;
      const rlogs = results[1].data;
      const tutorLogs = results[2].data;
      const testLogs = results[3].data;
      const mealLogs = results[4].data;
      const waterLogs = results[5].data;
      const ath = results[6].data;
      const waterGoal = results[7].data;

      const trainingDays = (ath as any)?.training_days_per_week ?? 4;
      const waterGoalMl = (waterGoal as any)?.goal_ml ?? 2000;

      // Count unique days with workout logs
      const workoutDays = new Set([
        ...(wlogs ?? []).map((l: any) => l.logged_at?.slice(0, 10)),
        ...(rlogs ?? []).map((l: any) => l.logged_at?.slice(0, 10)),
      ].filter(Boolean)).size;

      // Count school days (Mon-Fri) with study activity
      const studyDates = new Set([
        ...(tutorLogs ?? []).map((l: any) => l.created_at?.slice(0, 10)),
        ...(testLogs ?? []).map((l: any) => l.created_at?.slice(0, 10)),
      ].filter(Boolean));
      let daysWithStudy = 0;
      for (const d of studyDates) {
        const day = new Date(d + "T12:00:00").getDay();
        if (day >= 1 && day <= 5) daysWithStudy++;
      }

      // Count days with macros on track (within 20% of 2000 cal target)
      const mealsByDay: Record<string, number> = {};
      for (const m of mealLogs ?? []) {
        const d = (m as any).logged_at?.slice(0, 10);
        if (d) mealsByDay[d] = (mealsByDay[d] ?? 0) + ((m as any).calories ?? 0);
      }
      const daysWithMacros = Object.values(mealsByDay).filter((cal) => cal >= 1600 && cal <= 2400).length;

      // Count days water goal hit
      const waterByDay: Record<string, number> = {};
      for (const w of waterLogs ?? []) {
        const d = (w as any).logged_at?.slice(0, 10);
        if (d) waterByDay[d] = (waterByDay[d] ?? 0) + ((w as any).amount_ml ?? 0);
      }
      const daysWaterHit = Object.values(waterByDay).filter((ml) => ml >= waterGoalMl).length;

      const workoutScore = Math.min(40, (workoutDays / Math.max(1, trainingDays)) * 40);
      const studyScore = Math.min(30, (daysWithStudy / 5) * 30);
      const nutritionScore = Math.min(20, (daysWithMacros / 7) * 20);
      const waterScore = Math.min(10, (daysWaterHit / 7) * 10);
      const totalScore = Math.round(workoutScore + studyScore + nutritionScore + waterScore);

      // Award XP
      let xpAwarded = 0;
      if (totalScore === 100) xpAwarded = 500;
      else if (totalScore >= 90) xpAwarded = 200;
      else if (totalScore >= 80) xpAwarded = 100;

      if (xpAwarded > 0) {
        await supabase.rpc("increment_xp" as any, { p_user_id: user.id, p_amount: xpAwarded });
      }

      const row = {
        student_id: user.id,
        week_start_date: thisWeekStart,
        workout_score: Math.round(workoutScore),
        study_score: Math.round(studyScore),
        nutrition_score: Math.round(nutritionScore),
        water_score: Math.round(waterScore),
        total_score: totalScore,
        xp_awarded: xpAwarded,
      };

      const { data: upserted } = await supabase
        .from("consistency_scores" as any)
        .upsert(row, { onConflict: "student_id,week_start_date" })
        .select()
        .single();

      const newRow = (upserted ?? row) as unknown as ScoreRow;
      setCurrent(newRow);
      setHistory((prev) => {
        const filtered = prev.filter((r) => r.week_start_date !== thisWeekStart);
        return [newRow, ...filtered].slice(0, 7);
      });
    } catch (e: any) {
      console.error("Consistency score error:", e);
    } finally {
      setCalculating(false);
    }
  };

  const fetchCoachNote = async () => {
    if (!user || !current) return;
    setNoteLoading(true);
    setCoachNote(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: ath } = await supabase.from("athletic_profiles" as any).select("primary_sports,goals").eq("user_id" as any, user.id).maybeSingle();
      const { data: prefs } = await supabase.from("user_preferences" as any).select("first_name").eq("user_id" as any, user.id).maybeSingle();
      const firstName = (prefs as any)?.first_name ?? "Athlete";
      const sport = ((ath as any)?.primary_sports ?? []).join(", ") || "sport";
      const goals = (ath as any)?.goals ?? "improve performance";

      const prompt = `This student athlete had a consistency score of ${current.total_score} last week.
Workout consistency: ${Math.round((current.workout_score / 40) * 100)}%, Study consistency: ${Math.round((current.study_score / 30) * 100)}%, Nutrition: ${Math.round((current.nutrition_score / 20) * 100)}%, Water: ${Math.round((current.water_score / 10) * 100)}%
Their sport is ${sport}, their goals are ${goals}.

Write a 2-sentence weekly coaching message:
- Sentence 1: acknowledge what they did well specifically
- Sentence 2: identify the single biggest area to improve this week with one specific action
Be encouraging, direct, and personal. Use their first name: ${firstName}.`;

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
      setCoachNote(note.trim() || "Keep up the great work this week!");
    } catch {
      setCoachNote("Keep up the great work this week!");
    } finally {
      setNoteLoading(false);
    }
  };

  if (loading) {
    return <div className={cn("rounded-2xl bg-muted animate-pulse", compact ? "h-16" : "h-48")} />;
  }

  // Compact version for Workout/Tutor sections
  if (compact) {
    if (!current) return null;
    const color = scoreColor(current.total_score);
    return (
      <div className="rounded-xl border border-border bg-card/60 px-4 py-2.5 flex items-center gap-3 mb-4">
        <div className="text-xl font-bold" style={{ color }}>{current.total_score}</div>
        <div>
          <div className="text-xs font-semibold">Consistency Score</div>
          <div className="text-[10px] text-muted-foreground">Grade {scoreGrade(current.total_score)} this week</div>
        </div>
        <div className="ml-auto flex gap-1">
          {[
            { label: "💪", val: current.workout_score, max: 40 },
            { label: "📚", val: current.study_score, max: 30 },
            { label: "🥗", val: current.nutrition_score, max: 20 },
            { label: "💧", val: current.water_score, max: 10 },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center">
              <div className="text-[10px]">{item.label}</div>
              <div className="text-[10px] font-mono">{item.val}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full version for dashboard
  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">📊 Consistency Score</h3>
        <Button size="sm" variant="outline" onClick={calculateScore} disabled={calculating}>
          {calculating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
          {calculating ? "Calculating…" : "Calculate This Week"}
        </Button>
      </div>

      {!current ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          No score yet this week. Tap "Calculate This Week" to see your consistency score.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-6 mb-5 flex-wrap">
            <RingChart score={current.total_score} size={120} />
            <div className="flex-1 space-y-2 min-w-[180px]">
              <MiniBar label="💪 Workouts" value={current.workout_score} max={40} color="hsl(var(--sports))" />
              <MiniBar label="📚 Study" value={current.study_score} max={30} color="hsl(var(--primary))" />
              <MiniBar label="🥗 Nutrition" value={current.nutrition_score} max={20} color="hsl(142 70% 50%)" />
              <MiniBar label="💧 Water" value={current.water_score} max={10} color="hsl(200 80% 55%)" />
            </div>
          </div>

          {current.xp_awarded > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-400 mb-4 flex items-center gap-2">
              🏆 +{current.xp_awarded} XP awarded for {current.total_score === 100 ? "a perfect week! 🎯" : `a ${scoreGrade(current.total_score)}-grade week!`}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={fetchCoachNote} disabled={noteLoading} className="w-full mb-3">
            {noteLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            Get weekly coaching message
          </Button>

          {coachNote && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-primary/8 border border-primary/20 px-3 py-2.5 text-sm italic text-foreground/90 mb-4"
            >
              💬 {coachNote}
            </motion.div>
          )}
        </>
      )}

      {/* 6-week trend chart */}
      {history.length > 1 && (
        <div>
          <div className="text-xs text-muted-foreground mb-2 font-medium">6-Week Trend</div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={[...history].reverse()} barSize={20}>
              <XAxis dataKey="week_start_date" tickFormatter={weekLabel} tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                formatter={(v: number) => [`${v} (${scoreGrade(v)})`, "Score"]}
                labelFormatter={weekLabel}
                contentStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="total_score" radius={[4, 4, 0, 0]}>
                {[...history].reverse().map((row, i) => (
                  <Cell key={i} fill={scoreColor(row.total_score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
