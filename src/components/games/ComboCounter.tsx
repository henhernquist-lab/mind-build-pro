import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visual streak/combo display. Multiplier grows with consecutive correct answers.
 * Tier rules:
 *   1-2  -> hidden
 *   3-4  -> 1.5x  (warm)
 *   5-7  -> 2x    (hot)
 *   8-11 -> 3x    (fire)
 *   12+  -> 5x    (inferno)
 */
export const comboMultiplier = (streak: number): number => {
  if (streak >= 12) return 5;
  if (streak >= 8) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
};

const tierLabel = (m: number) =>
  m >= 5 ? "INFERNO" : m >= 3 ? "ON FIRE" : m >= 2 ? "HOT" : m >= 1.5 ? "WARM" : "";

const tierClasses = (m: number) =>
  m >= 5
    ? "from-fuchsia-500 via-rose-500 to-orange-500"
    : m >= 3
    ? "from-orange-500 via-red-500 to-rose-500"
    : m >= 2
    ? "from-amber-500 to-orange-500"
    : "from-yellow-400 to-amber-500";

interface ComboCounterProps {
  streak: number;
  className?: string;
  compact?: boolean;
}

export const ComboCounter = ({ streak, className, compact }: ComboCounterProps) => {
  const mult = comboMultiplier(streak);
  const visible = streak >= 3;

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={`${mult}-${streak}`}
          initial={{ scale: 0.6, opacity: 0, y: -8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-white shadow-lg bg-gradient-to-r",
            tierClasses(mult),
            className
          )}
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 0.6 }}
          >
            <Flame className="h-4 w-4" />
          </motion.div>
          <span className="font-black text-sm tabular-nums">{streak}x</span>
          {!compact && (
            <>
              <span className="text-[10px] uppercase tracking-widest opacity-90">{tierLabel(mult)}</span>
              <span className="font-bold text-xs">·{mult}× XP</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ComboCounter;