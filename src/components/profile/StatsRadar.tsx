import { useEffect, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/** 6-axis radar of overall athletic + academic balance. */
export const StatsRadar = () => {
  const { user } = useAuth();
  const [data, setData] = useState<{ axis: string; value: number }[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since14 = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

      const [athleticStats, academicStats, workouts, meals, streak, prs] = await Promise.all([
        supabase.from("user_stats").select("xp").eq("user_id", user.id).maybeSingle(),
        supabase.from("academic_stats").select("xp").eq("user_id", user.id).maybeSingle(),
        supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("logged_at", since14),
        supabase.from("meal_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("log_date", since7),
        supabase.from("study_streak").select("current_streak").eq("user_id", user.id).maybeSingle(),
        supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_pr", true),
      ]);

      const norm = (v: number, max: number) => Math.min(100, Math.round((v / max) * 100));

      setData([
        { axis: "Athletic", value: norm(athleticStats.data?.xp ?? 0, 1000) },
        { axis: "Academic", value: norm(academicStats.data?.xp ?? 0, 1500) },
        { axis: "Consistency", value: norm(workouts.count ?? 0, 14) },
        { axis: "Nutrition", value: norm(meals.count ?? 0, 21) },
        { axis: "Streak", value: norm(streak.data?.current_streak ?? 0, 30) },
        { axis: "PRs", value: norm(prs.count ?? 0, 10) },
      ]);
    })();
  }, [user?.id]);

  return (
    <div className="rounded-2xl glass p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Performance Radar</div>
      <div className="text-sm font-semibold mt-0.5 mb-3">Your balance across 6 dimensions</div>
      <div className="h-64">
        {data && (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="78%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar
                name="You"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.35}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};