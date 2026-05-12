import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Star, ArrowUpDown, Crown, Sparkles, Globe2, Lock, ArrowUp, ArrowDown, Minus, Share2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import {
  listSnapshots, listAwards, getOptIn, setOptIn, getCurrentLeaderboard,
  type SeasonSnapshot, type SeasonAward, type CurrentLeaderRow,
} from "@/lib/seasons/hallOfFame";

type Tab = "trophies" | "leaderboard";

export const HallOfFame = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("trophies");
  const [snaps, setSnaps] = useState<SeasonSnapshot[]>([]);
  const [awards, setAwards] = useState<SeasonAward[]>([]);
  const [order, setOrder] = useState<"new" | "old">("new");
  const [optedIn, setOptedInState] = useState(false);
  const [board, setBoard] = useState<CurrentLeaderRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [s, a, o] = await Promise.all([
        listSnapshots(user.id),
        listAwards(user.id),
        getOptIn(user.id),
      ]);
      setSnaps(s); setAwards(a); setOptedInState(o);
    })();
  }, [user?.id]);

  // Realtime leaderboard subscription
  useEffect(() => {
    if (tab !== "leaderboard") return;
    let alive = true;
    const refresh = async () => {
      const rows = await getCurrentLeaderboard(10);
      if (alive) setBoard(rows);
    };
    refresh();
    const ch = supabase
      .channel("hof-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_stats" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "academic_stats" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "season_optin" }, refresh)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [tab]);

  const sortedSnaps = useMemo(() => {
    const list = [...snaps].sort((a, b) => order === "new" ? b.season_number - a.season_number : a.season_number - b.season_number);
    // Pin best season at top regardless of order
    const best = list.find((s) => s.is_best_season);
    if (!best) return list;
    return [best, ...list.filter((s) => s.id !== best.id)];
  }, [snaps, order]);

  // Prior-season lookup by season_number for comparison arrows
  const priorBySeason = useMemo(() => {
    const m: Record<number, SeasonSnapshot> = {};
    for (const s of snaps) m[s.season_number] = s;
    return m;
  }, [snaps]);

  const shareSnap = async (snap: SeasonSnapshot) => {
    const node = document.getElementById(`season-card-${snap.id}`);
    if (!node) return;
    try {
      toast.loading("Generating image…", { id: "share-snap" });
      const canvas = await html2canvas(node, { backgroundColor: null, scale: 2, useCORS: true });
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("blob");
      const file = new File([blob], `season-${snap.season_number}.png`, { type: "image/png" });
      const navAny = navigator as any;
      if (navAny.canShare?.({ files: [file] })) {
        await navAny.share({ files: [file], title: `Season ${snap.season_number}`, text: `My Season ${snap.season_number} recap` });
        toast.success("Shared", { id: "share-snap" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `season-${snap.season_number}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        toast.success("Image downloaded", { id: "share-snap" });
      }
    } catch {
      toast.error("Couldn't generate image", { id: "share-snap" });
    }
  };

  const awardsBySnap = useMemo(() => {
    const m: Record<string, SeasonAward[]> = {};
    for (const a of awards) (m[a.snapshot_id] ||= []).push(a);
    return m;
  }, [awards]);

  const toggleOptIn = async (v: boolean) => {
    if (!user) return;
    setOptedInState(v);
    await setOptIn(user.id, v);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Hall of Fame
        </h2>
        <div className="flex rounded-xl border border-border bg-muted/30 p-1 text-xs">
          <button onClick={() => setTab("trophies")} className={cn("px-3 py-1.5 rounded-lg font-semibold", tab === "trophies" && "bg-background shadow")}>Trophy Case</button>
          <button onClick={() => setTab("leaderboard")} className={cn("px-3 py-1.5 rounded-lg font-semibold", tab === "leaderboard" && "bg-background shadow")}>Leaderboard</button>
        </div>
      </div>

      {tab === "trophies" && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-normalst text-muted-foreground">Lifetime awards</div>
              <div className="text-xl font-semibold">{awards.length}</div>
              <div className="text-xs text-muted-foreground">across {snaps.length} season{snaps.length === 1 ? "" : "s"}</div>
            </div>
            {snaps.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setOrder(order === "new" ? "old" : "new")}>
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                {order === "new" ? "Newest" : "Oldest"}
              </Button>
            )}
          </div>

          {snaps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <h3 className="font-bold">Season 1 is in progress</h3>
              <p className="text-sm text-muted-foreground mt-1">Your first trophy card will appear here when this 2-week period ends.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSnaps.map((s) => {
                const a = awardsBySnap[s.id] ?? [];
                const prev = priorBySeason[s.season_number - 1];
                return (
                  <motion.div
                    key={s.id}
                    id={`season-card-${s.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "rounded-2xl border bg-card p-5 relative overflow-hidden",
                      s.is_best_season ? "border-amber-400/60 shadow-[0_0_24px_-6px_hsl(45_90%_55%/.5)]" : "border-border",
                    )}
                  >
                    {s.is_best_season && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-amber-500 text-amber-950 text-[10px] font-semibold tracking-normalst px-3 py-1 rounded-bl-xl flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" /> BEST SEASON
                      </div>
                    )}
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-normalst text-muted-foreground">Season {s.season_number}</div>
                        <div className="text-xs text-muted-foreground">{new Date(s.start_date).toLocaleDateString()} → {new Date(s.end_date).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="rounded-xl border border-border p-3">
                        <div className="text-[10px] uppercase tracking-normalst text-muted-foreground">Athletic peak</div>
                        <div className="font-semibold text-sm">{s.peak_athletic_rank_icon} {s.peak_athletic_rank_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span>{s.athletic_xp} XP</span>
                          <Delta current={s.athletic_xp} prior={prev?.athletic_xp} />
                        </div>
                      </div>
                      <div className="rounded-xl border border-border p-3">
                        <div className="text-[10px] uppercase tracking-normalst text-muted-foreground">Academic peak</div>
                        <div className="font-semibold text-sm">{s.peak_academic_rank_icon} {s.peak_academic_rank_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span>{s.academic_xp} XP</span>
                          <Delta current={s.academic_xp} prior={prev?.academic_xp} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <Stat label="Workouts" value={s.total_workouts} prior={prev?.total_workouts} />
                      <Stat label="PRs" value={s.total_prs} prior={prev?.total_prs} />
                      <Stat label="Games" value={s.total_games} prior={prev?.total_games} />
                    </div>

                    {a.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {a.map((aw) => (
                          <span key={aw.id} title={aw.description ?? ""} className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[11px] font-semibold">
                            {aw.award_icon} {aw.award_name}
                          </span>
                        ))}
                      </div>
                    )}

                    {s.ai_recap && (
                      <p className="text-xs text-muted-foreground italic mt-3 border-l-2 border-primary/40 pl-2">{s.ai_recap}</p>
                    )}

                    <div className="mt-3 flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => shareSnap(s)} className="h-7 text-xs gap-1.5">
                        <Share2 className="h-3.5 w-3.5" /> Share
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "leaderboard" && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {optedIn ? <Globe2 className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              <div>
                <div className="font-semibold">Public season leaderboard</div>
                <div className="text-xs text-muted-foreground">{optedIn ? "You appear in the top 10" : "Opt in to compete publicly"}</div>
              </div>
            </div>
            <Switch checked={optedIn} onCheckedChange={toggleOptIn} />
          </div>

          {board.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No one has opted in yet. Be the first.
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {board.map((r, i) => {
                const isMe = r.user_id === user?.id;
                return (
                  <div key={r.user_id} className={cn("flex items-center gap-3 px-4 py-3 border-b border-border last:border-0", isMe && "bg-primary/10")}>
                    <div className={cn("w-7 text-center font-semibold", i === 0 ? "text-amber-400" : i < 3 ? "text-foreground" : "text-muted-foreground")}>
                      {i === 0 ? <Crown className="h-5 w-5 mx-auto" /> : `#${i + 1}`}
                    </div>
                    <div className="h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center text-sm font-semibold">
                      {r.avatar_url ? <img src={r.avatar_url} alt="" className="h-full w-full object-cover" /> : (r.display_name?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{r.display_name ?? r.username ?? "Anonymous"}{isMe && <span className="ml-2 text-[10px] uppercase tracking-normalst text-primary">you</span>}</div>
                      <div className="text-[11px] text-muted-foreground">{r.athletic_rank_icon} {r.athletic_xp} • {r.academic_rank_icon} {r.academic_xp}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">{r.total_xp}</div>
                      <div className="text-[10px] uppercase tracking-normalst text-muted-foreground">XP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value, prior }: { label: string; value: number; prior?: number }) => (
  <div className="rounded-lg bg-muted/30 py-2">
    <div className="text-lg font-semibold tabular-nums flex items-center justify-center gap-1">
      <span>{value}</span>
      <Delta current={value} prior={prior} compact />
    </div>
    <div className="text-[10px] uppercase tracking-normalst text-muted-foreground">{label}</div>
  </div>
);

const Delta = ({ current, prior, compact }: { current: number; prior?: number; compact?: boolean }) => {
  if (prior === undefined || prior === null) return null;
  const diff = current - prior;
  if (diff === 0) {
    return <span className="inline-flex items-center text-[10px] text-muted-foreground"><Minus className="h-3 w-3" /></span>;
  }
  const up = diff > 0;
  const pct = prior > 0 ? Math.round((diff / prior) * 100) : null;
  return (
    <span className={cn("inline-flex items-center text-[10px] font-semibold", up ? "text-emerald-500" : "text-rose-500")}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {!compact && (pct !== null ? `${Math.abs(pct)}%` : Math.abs(diff))}
    </span>
  );
};