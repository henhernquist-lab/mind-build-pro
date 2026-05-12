import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const DAYS = 84; // ~12 weeks
const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/** GitHub-style 12-week heatmap of workout activity. */
export const WorkoutHeatmap = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const since = isoDaysAgo(DAYS - 1);
      const { data } = await supabase
        .from("workout_logs")
        .select("logged_at")
        .eq("user_id", user.id)
        .gte("logged_at", since);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        const d = String(r.logged_at).slice(0, 10);
        map[d] = (map[d] ?? 0) + 1;
      });
      setCounts(map);
      setLoading(false);
    })();
  }, [user?.id]);

  const cells = useMemo(() => {
    const arr: { date: string; count: number }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const date = isoDaysAgo(i);
      arr.push({ date, count: counts[date] ?? 0 });
    }
    return arr;
  }, [counts]);

  const intensity = (c: number) => {
    if (c === 0) return 0;
    if (c === 1) return 1;
    if (c === 2) return 2;
    if (c <= 4) return 3;
    return 4;
  };

  const colorFor = (lvl: number) => {
    if (lvl === 0) return "hsl(var(--muted) / 0.4)";
    return `hsl(var(--sports) / ${0.25 + lvl * 0.18})`;
  };

  const totalWorkouts = cells.reduce((s, c) => s + c.count, 0);
  const activeDays = cells.filter((c) => c.count > 0).length;

  return (
    <div className="rounded-2xl glass p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-normalst text-muted-foreground">12-Week Workout Heatmap</div>
          <div className="text-sm font-semibold mt-0.5">
            {totalWorkouts} workouts · {activeDays} active days
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colorFor(l) }} />
          ))}
          <span>More</span>
        </div>
      </div>
      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${DAYS / 7}, 1fr)`,
            gridAutoFlow: "column",
            gridTemplateRows: "repeat(7, 1fr)",
          }}
        >
          {cells.map((c) => {
            const lvl = intensity(c.count);
            return (
              <div
                key={c.date}
                title={`${c.date} — ${c.count} workout${c.count === 1 ? "" : "s"}`}
                className="aspect-square rounded-[3px] transition-all hover:ring-1 hover:ring-foreground/30"
                style={{ backgroundColor: colorFor(lvl) }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};