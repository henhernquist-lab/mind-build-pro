import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchAllHistory, ATHLETIC_RANKS, ACADEMIC_RANKS } from "@/lib/ranks2";
import { History } from "lucide-react";

type Row = {
  id: string;
  rank_type: "athletic" | "academic";
  final_xp: number;
  highest_rank_name: string;
  highest_rank_icon: string;
  month_name: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

const colorFor = (type: "athletic" | "academic", name: string) => {
  const list = type === "athletic" ? ATHLETIC_RANKS : ACADEMIC_RANKS;
  return list.find((r) => r.name === name)?.color ?? "hsl(var(--primary))";
};

export const RankHistoryTimeline = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchAllHistory(user.id).then((r) => {
      setRows(r as Row[]);
      setLoaded(true);
    });
  }, [user?.id]);

  if (!loaded) return null;
  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card/50 p-5 text-center">
        <History className="h-5 w-5 mx-auto text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-2">
          Your past biweekly ranks will appear here once your first period ends.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Rank History</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">{rows.length} period{rows.length === 1 ? "" : "s"}</span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const color = colorFor(r.rank_type, r.highest_rank_name);
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <div className="text-2xl leading-none">{r.highest_rank_icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate" style={{ color }}>{r.highest_rank_name}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {r.rank_type === "athletic" ? "💪 Athletic" : "🎓 Academic"}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">{r.month_name}</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold tabular-nums">{r.final_xp}</div>
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">XP</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};