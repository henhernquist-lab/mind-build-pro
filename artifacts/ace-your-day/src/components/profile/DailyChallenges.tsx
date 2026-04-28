import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getDailyChallenges, claimChallenge, type DailyChallenge } from "@/lib/dailyChallenges";
import { useRank } from "@/lib/ranks2";
import { sfx } from "@/lib/sounds";
import { cn } from "@/lib/utils";

const categoryIcon = (c: string) => (c === "athletic" ? "💪" : c === "games" ? "🎮" : "📚");

export const DailyChallenges = () => {
  const { user } = useAuth();
  const academic = useRank("academic");
  const athletic = useRank("athletic");
  const [items, setItems] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    const list = await getDailyChallenges(user.id);
    setItems(list);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { reload(); }, [reload]);

  const onClaim = async (c: DailyChallenge) => {
    if (!user) return;
    setClaiming(c.id);
    const xp = await claimChallenge(c.id);
    if (xp > 0) {
      sfx.xp();
      // Athletic-only challenges grant athletic XP, otherwise academic
      if (c.category === "athletic") await athletic.addXp(xp);
      else await academic.addXp(xp);
    }
    setClaiming(null);
    await reload();
  };

  const completedAll = items.length > 0 && items.every((c) => c.claimed);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Target className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-semibold">Daily Challenges</h2>
        </div>
        {completedAll && (
          <span className="text-xs font-bold text-emerald-400 inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> All done!
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {items.map((c) => {
              const pct = Math.min(100, Math.round((c.progress / Math.max(1, c.target)) * 100));
              const done = c.progress >= c.target;
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    c.claimed
                      ? "border-emerald-500/30 bg-emerald-500/5 opacity-70"
                      : done
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-background/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{categoryIcon(c.category)}</span>
                        <span className="font-bold text-sm truncate">{c.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Reward
                      </div>
                      <div className="text-sm font-bold text-primary tabular-nums">
                        +{c.xp_reward} XP
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={cn("h-full", done ? "bg-emerald-500" : "bg-primary")}
                        initial={false}
                        animate={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums w-14 text-right">
                      {c.progress}/{c.target}
                    </div>
                    {done && !c.claimed && (
                      <Button
                        size="sm"
                        variant="premium"
                        className="h-7 px-2 text-xs font-bold"
                        disabled={claiming === c.id}
                        onClick={() => onClaim(c)}
                      >
                        <Sparkles className="h-3 w-3 mr-1" /> Claim
                      </Button>
                    )}
                    {c.claimed && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-3 text-center">
        Resets every day at midnight. New challenges chosen for you.
      </p>
    </section>
  );
};

export default DailyChallenges;