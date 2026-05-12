import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { listSnapshots, listAwards, type SeasonSnapshot, type SeasonAward } from "@/lib/seasons/hallOfFame";

export const SeasonCeremony = () => {
  const { user, profile } = useAuth();
  const [snap, setSnap] = useState<SeasonSnapshot | null>(null);
  const [awards, setAwards] = useState<SeasonAward[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const list = await listSnapshots(user.id);
      const unseen = list.find((s) => !s.ceremony_seen);
      if (!unseen) return;
      const all = await listAwards(user.id);
      setAwards(all.filter((a) => a.snapshot_id === unseen.id));
      setSnap(unseen);
      setOpen(true);

      // Generate motivational start message
      try {
        const { data } = await supabase.functions.invoke("season-recap", {
          body: {
            mode: "start",
            displayName: profile?.display_name || "Athlete",
            seasonNumber: unseen.season_number + 1,
            goals: [],
          },
        });
        setMsg((data as any)?.recap ?? "New season — let's stack wins.");
      } catch {
        setMsg("New season — let's stack wins.");
      }
    })();
  }, [user?.id]);

  const dismiss = async () => {
    if (snap && user) {
      await supabase.from("season_snapshots").update({ ceremony_seen: true }).eq("id", snap.id);
    }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && snap && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="max-w-lg w-full rounded-3xl border-2 border-primary/40 bg-card p-8 text-center shadow-2xl"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
              className="mx-auto h-20 w-20 rounded-2xl bg-primary/15 flex items-center justify-center mb-4"
            >
              <Trophy className="h-10 w-10 text-primary" />
            </motion.div>
            <p className="text-xs uppercase tracking-normal text-muted-foreground">Season {snap.season_number + 1} begins</p>
            <h2 className="text-xl font-semibold mt-2">SEASON {snap.season_number + 1}</h2>

            <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4 text-left">
              <div className="text-[10px] uppercase tracking-normalst text-muted-foreground">Last season recap</div>
              <div className="mt-1 text-sm font-semibold">
                {snap.peak_athletic_rank_icon} {snap.peak_athletic_rank_name} • {snap.athletic_xp} ath XP
              </div>
              <div className="text-sm font-semibold">
                {snap.peak_academic_rank_icon} {snap.peak_academic_rank_name} • {snap.academic_xp} acad XP
              </div>
              {snap.ai_recap && <p className="text-xs text-muted-foreground mt-2 italic">"{snap.ai_recap}"</p>}
            </div>

            {awards.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-normalst text-muted-foreground mb-2">Awards earned</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {awards.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.4 + i * 0.15, type: "spring" }}
                      className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span className="text-base">{a.award_icon}</span>
                      {a.award_name}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {msg && (
              <p className="mt-5 text-sm text-foreground/80 flex items-start gap-2 text-left">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{msg}</span>
              </p>
            )}

            <Button className="mt-6 w-full" size="lg" onClick={dismiss}>
              Let's Go 🔥
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};