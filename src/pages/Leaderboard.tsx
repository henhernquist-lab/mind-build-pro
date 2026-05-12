import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ATHLETIC_RANKS, ACADEMIC_RANKS, getRank } from "@/lib/ranks2";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type Mode = "athletic" | "academic";

interface Row {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  xp: number;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("academic");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        _rank_type: mode,
        _limit: 50,
      });
      if (!error) setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [mode]);

  const ranks = mode === "academic" ? ACADEMIC_RANKS : ATHLETIC_RANKS;
  const myIdx = rows.findIndex((r) => r.user_id === user?.id);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-normalst text-muted-foreground">Leaderboard</p>
        <h1 className="text-xl font-semibold mt-1">🏆 Top Climbers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Current period XP rankings — resets every two weeks alongside ranks.
        </p>
      </header>

      {/* Mode toggle */}
      <div className="inline-flex rounded-full border border-border bg-card p-1 mb-6">
        {(["academic", "athletic"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-full transition-colors capitalize",
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "academic" ? "🎓" : "💪"} {m}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Trophy className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No climbers yet for this period. Be the first to log XP!
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {rows.map((r, i) => {
            const rank = getRank(r.xp, ranks);
            const isMe = r.user_id === user?.id;
            const podium = i < 3;
            const podiumColor = i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : "text-orange-400";
            return (
              <motion.div
                key={r.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-b border-border last:border-0",
                  isMe && "bg-primary/10",
                )}
              >
                <div className={cn("w-8 text-center font-semibold tabular-nums text-lg", podium ? podiumColor : "text-muted-foreground")}>
                  {podium ? (
                    i === 0 ? <Crown className="h-5 w-5 mx-auto" /> : <Medal className="h-5 w-5 mx-auto" />
                  ) : (
                    `#${i + 1}`
                  )}
                </div>
                <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center text-sm font-semibold">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} className="h-full w-full object-cover" alt="" />
                  ) : (
                    (r.display_name?.[0] ?? "?").toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold truncate">
                    {r.username ? (
                      <Link to={`/athlete/${r.username}`} className="hover:underline truncate">
                        {r.display_name ?? r.username}
                      </Link>
                    ) : (
                      <span className="truncate">{r.display_name ?? "Anonymous"}</span>
                    )}
                    {isMe && <span className="text-[10px] uppercase tracking-normalst text-primary">you</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {rank.icon} {rank.name}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-lg tabular-nums">{r.xp}</div>
                  <div className="text-[10px] uppercase tracking-normalst text-muted-foreground">XP</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && myIdx === -1 && rows.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          You're not on the board yet — earn some XP to join the climb!
        </p>
      )}
    </div>
  );
};

export default Leaderboard;