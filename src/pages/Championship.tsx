import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Medal, Trophy, Loader2, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  getActiveSeason,
  getSeasonRewards,
  getSeasonLeaderboard,
  getMySeasonResults,
  claimSeasonReward,
  daysRemaining,
  type Season,
  type SeasonReward,
  type SeasonLeaderRow,
  type SeasonResult,
} from "@/lib/seasons/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Championship = () => {
  const { user } = useAuth();
  const [season, setSeason] = useState<Season | null>(null);
  const [rewards, setRewards] = useState<SeasonReward[]>([]);
  const [rows, setRows] = useState<SeasonLeaderRow[]>([]);
  const [myResults, setMyResults] = useState<SeasonResult[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const s = await getActiveSeason();
    setSeason(s);
    if (s) {
      const [r, l] = await Promise.all([getSeasonRewards(s.id), getSeasonLeaderboard(s.id, 25)]);
      setRewards(r);
      setRows(l);
    }
    if (user) setMyResults(await getMySeasonResults(user.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onClaim = async (resultId: string) => {
    const ok = await claimSeasonReward(resultId);
    if (ok) {
      toast.success("🏆 Reward claimed!");
      load();
    } else {
      toast.error("Could not claim reward");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!season) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Trophy className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-bold">No active championship</h2>
          <p className="text-sm text-muted-foreground mt-1">Check back soon — a new season is on the horizon.</p>
          {myResults.length > 0 && (
            <div className="mt-6 text-left">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Past results</h3>
              <UnclaimedRewards results={myResults} onClaim={onClaim} />
            </div>
          )}
        </div>
      </div>
    );
  }

  const days = daysRemaining(season);
  const color = season.theme_color || "hsl(var(--primary))";
  const myRow = rows.find((r) => r.user_id === user?.id);
  const myIdx = rows.findIndex((r) => r.user_id === user?.id);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Seasonal Championship</p>
        <h1 className="text-3xl font-black mt-1 flex items-center gap-2">
          <Trophy className="h-7 w-7" style={{ color }} />
          {season.name}
        </h1>
        {season.description && (
          <p className="text-sm text-muted-foreground mt-2">{season.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs">
          <span className="px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
            {days} days left
          </span>
          <span className="text-muted-foreground">
            {new Date(season.start_date).toLocaleDateString()} → {new Date(season.end_date).toLocaleDateString()}
          </span>
        </div>
      </header>

      {/* My standing */}
      {user && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Your standing</div>
          <div className="flex items-baseline gap-3 mt-1">
            <div className="text-3xl font-black tabular-nums">
              {myIdx >= 0 ? `#${myIdx + 1}` : "—"}
            </div>
            <div className="text-sm text-muted-foreground">
              {myRow ? `${myRow.xp} XP this season` : "Earn XP to join the board"}
            </div>
          </div>
        </div>
      )}

      {/* Rewards */}
      {rewards.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Podium Rewards</h2>
          <div className="grid grid-cols-3 gap-3">
            {rewards.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 text-center">
                <div className="text-3xl">{r.badge_icon}</div>
                <div className="text-xs font-bold mt-1">#{r.placement}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{r.badge_name}</div>
                <div className="text-xs font-black mt-2 text-primary">+{r.bonus_xp} XP</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Unclaimed rewards */}
      <UnclaimedRewards results={myResults} onClaim={onClaim} />

      {/* Leaderboard */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Live Standings</h2>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Be the first to log XP this season!
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {rows.map((r, i) => {
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
                  <div className={cn("w-8 text-center font-black tabular-nums text-lg", podium ? podiumColor : "text-muted-foreground")}>
                    {podium ? (i === 0 ? <Crown className="h-5 w-5 mx-auto" /> : <Medal className="h-5 w-5 mx-auto" />) : `#${i + 1}`}
                  </div>
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center text-sm font-bold">
                    {r.avatar_url ? <img src={r.avatar_url} className="h-full w-full object-cover" alt="" /> : (r.display_name?.[0] ?? "?").toUpperCase()}
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
                      {isMe && <span className="text-[10px] uppercase tracking-widest text-primary">you</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-lg tabular-nums">{r.xp}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">XP</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

const UnclaimedRewards = ({
  results,
  onClaim,
}: {
  results: SeasonResult[];
  onClaim: (id: string) => void;
}) => {
  const unclaimed = results.filter((r) => r.placement && !r.claimed);
  if (unclaimed.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
        <Gift className="h-4 w-4" />
        Unclaimed Rewards
      </h2>
      <div className="space-y-2">
        {unclaimed.map((r) => (
          <div key={r.id} className="rounded-2xl border border-primary/40 bg-primary/5 p-4 flex items-center gap-3">
            <div className="text-2xl">{r.badge_earned ? "🏆" : "🎖️"}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">#{r.placement} • +{r.bonus_xp_awarded} XP</div>
              <div className="text-xs text-muted-foreground">{r.badge_earned ?? "Season reward"}</div>
            </div>
            <Button size="sm" onClick={() => onClaim(r.id)}>Claim</Button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Championship;