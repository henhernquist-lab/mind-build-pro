import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, X } from "lucide-react";
import { useRank, getCountdown } from "@/lib/ranks2";

const DISMISS_KEY = "season-ends-dismissed";

export const SeasonEndsBanner = () => {
  const athletic = useRank("athletic");
  const academic = useRank("academic");
  const [tick, setTick] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY));
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Pick the soonest-ending period that has < 24h left
  const periods = [
    athletic.periodStart ? { type: "Season", start: athletic.periodStart } : null,
    academic.periodStart ? { type: "Season", start: academic.periodStart } : null,
  ].filter(Boolean) as { type: string; start: string }[];

  const soonest = periods
    .map((p) => ({ ...p, c: getCountdown(p.start) }))
    .filter((p) => p.c.total > 0 && p.c.total <= 24 * 3600 * 1000)
    .sort((a, b) => a.c.total - b.c.total)[0];

  // Tick is read so dependency is satisfied
  void tick;

  if (!soonest) return null;
  // Dismissal is per-period (keyed by start date)
  if (dismissed === soonest.start) return null;

  const hours = Math.max(1, soonest.c.days * 24 + soonest.c.hours);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sticky top-0 z-40 bg-amber-500/15 border-b border-amber-500/40 backdrop-blur"
      >
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3 text-sm">
          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="font-semibold">Season ends in ~{hours}h</span>
          <span className="text-muted-foreground hidden sm:inline">— last chance to climb the ranks before reset.</span>
          <button
            onClick={() => { localStorage.setItem(DISMISS_KEY, soonest.start); setDismissed(soonest.start); }}
            className="ml-auto p-1 rounded hover:bg-amber-500/20"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
