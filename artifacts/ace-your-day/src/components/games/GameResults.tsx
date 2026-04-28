import { motion } from "framer-motion";
import { Trophy, RotateCcw, ArrowLeft, Sparkles, Flame, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export interface ResultStat {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}

interface GameResultsProps {
  emoji: string;
  title: string;
  subtitle?: string;
  xpEarned: number;
  bestStreak?: number;
  accuracy?: number;
  stats?: ResultStat[];
  isNewBest?: boolean;
  onPlayAgain: () => void;
  back?: string;
}

const grade = (acc: number): { letter: string; color: string } => {
  if (acc >= 95) return { letter: "S", color: "text-fuchsia-400" };
  if (acc >= 85) return { letter: "A", color: "text-emerald-400" };
  if (acc >= 70) return { letter: "B", color: "text-sky-400" };
  if (acc >= 55) return { letter: "C", color: "text-amber-400" };
  return { letter: "D", color: "text-rose-400" };
};

export const GameResults = ({
  emoji,
  title,
  subtitle,
  xpEarned,
  bestStreak,
  accuracy,
  stats = [],
  isNewBest,
  onPlayAgain,
  back = "/games",
}: GameResultsProps) => {
  const g = accuracy != null ? grade(accuracy) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="rounded-3xl border border-border bg-card overflow-hidden max-w-xl mx-auto"
    >
      <div className="relative p-8 text-center bg-gradient-to-br from-primary/20 via-card to-card">
        {isNewBest && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold px-3 py-1 mb-3 uppercase tracking-widest"
          >
            <Sparkles className="h-3 w-3" /> New Personal Best!
          </motion.div>
        )}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="text-6xl mb-2"
        >
          {emoji}
        </motion.div>
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-center"
          >
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3" /> XP
            </div>
            <div className="text-2xl font-black text-primary tabular-nums mt-1">+{xpEarned}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-center"
          >
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1">
              <Flame className="h-3 w-3" /> Best Streak
            </div>
            <div className="text-2xl font-black text-orange-400 tabular-nums mt-1">
              {bestStreak ?? 0}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center"
          >
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1">
              <Target className="h-3 w-3" /> Grade
            </div>
            <div className={`text-2xl font-black tabular-nums mt-1 ${g?.color ?? "text-muted-foreground"}`}>
              {g?.letter ?? "—"}
            </div>
          </motion.div>
        </div>

        {stats.length > 0 && (
          <div className="rounded-xl border border-border bg-background/50 divide-y divide-border">
            {stats.map((s) => (
              <div key={s.label} className="flex justify-between items-center px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className={`font-bold tabular-nums ${s.highlight ? "text-primary" : ""}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to={back}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Games
            </Link>
          </Button>
          <Button variant="premium" className="flex-1 font-bold" onClick={onPlayAgain}>
            <RotateCcw className="h-4 w-4 mr-1" /> Play Again
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default GameResults;