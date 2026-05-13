import { useEffect, useState } from "react";
import { Trophy, Clock, Dumbbell, Star, Share2, Sparkles, ChevronRight, CheckCircle2, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { Grade, gradeColor } from "@/lib/athlete";

interface SessionExercise {
  name: string;
  sets: { type: string; weight: string; reps: string; grade?: Grade; isPR?: boolean; gradeLabel?: string; percentile?: number; ratio?: number; estimated1RM?: number }[];
  muscle_group: string;
}

export const WorkoutSummary = ({
  session,
  onClose,
}: {
  session: {
    name: string;
    duration: number;
    exercises: SessionExercise[];
    totalVolume: number;
    xpEarned: number;
    prCount: number;
    isRecovery?: boolean;
    scoutNote?: string;
    overallGrade?: Grade;
  };
  onClose: () => void;
}) => {
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#00E5FF", "#FFD700", "#FFFFFF"]
    });
  }, []);

  const RATINGS = [
    { emoji: "😫", label: "Terrible" },
    { emoji: "😐", label: "OK" },
    { emoji: "😊", label: "Good" },
    { emoji: "💪", label: "Great" },
    { emoji: "🔥", label: "Best Ever" },
  ];

  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const totalReps = session.exercises.reduce((acc, ex) => acc + ex.sets.reduce((sAcc, s) => sAcc + (parseInt(s.reps) || 0), 0), 0);

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in zoom-in-95 duration-500">
      <div className="p-8 text-center space-y-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 15 }}
          className="mx-auto h-24 w-24 rounded-3xl bg-amber-400 flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.5)] rotate-3"
        >
          <Trophy className="h-12 w-12 text-black" />
        </motion.div>

        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">WORKOUT COMPLETE!</h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] font-black uppercase tracking-widest">
            <CheckCircle2 className="h-3 w-3" /> {session.name}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center"
        >
           <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Overall Session Grade</div>
           <div className="relative group">
              <div className="absolute inset-0 bg-[#00E5FF] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div
                className="relative h-24 w-24 rounded-3xl flex items-center justify-center font-black text-5xl border-4 border-white/10 shadow-2xl"
                style={{ backgroundColor: gradeColor(session.overallGrade || 'B'), color: 'black' }}
              >
                {session.overallGrade || 'B'}
              </div>
           </div>
        </motion.div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {[
          { label: "Duration", value: `${Math.floor(session.duration / 60)}m ${session.duration % 60}s`, icon: Clock, color: "text-foreground" },
          { label: "Volume", value: `${session.totalVolume.toLocaleString()}`, unit: "lbs", icon: Dumbbell, color: "text-[#00E5FF]" },
          { label: "Total Sets", value: totalSets, icon: TrendingUp, color: "text-foreground" },
          { label: "PRs Broken", value: session.prCount, icon: Trophy, color: "text-amber-400" },
        ].map((stat, i) => (
          <Card key={i} className="p-4 bg-accent/10 border-border/50 flex flex-col items-center text-center">
            <stat.icon className={cn("h-4 w-4 mb-2 opacity-50", stat.color)} />
            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter mb-1">{stat.label}</div>
            <div className={cn("text-xl font-black tabular-nums", stat.color)}>
              {stat.value} {stat.unit && <span className="text-[10px] font-bold opacity-60 ml-0.5">{stat.unit}</span>}
            </div>
          </Card>
        ))}
      </div>

      {session.prCount > 0 && (
        <div className="p-6">
           <h3 className="text-xs uppercase tracking-widest font-black text-amber-400 mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 fill-amber-400" /> {session.prCount} PERSONAL RECORDS SMASHED!
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {session.exercises.map(ex => ex.sets.map((s, i) => s.isPR && (
              <motion.div
                key={`${ex.name}-${i}`}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="p-4 rounded-2xl bg-gradient-to-r from-amber-400/20 to-transparent border border-amber-400/30 flex items-center justify-between"
              >
                <div>
                  <div className="text-[10px] uppercase font-black text-amber-400 tracking-widest mb-1">New All-Time Best</div>
                  <div className="text-xl font-black uppercase italic">{ex.name}</div>
                </div>
                <div className="text-right">
                   <div className="text-2xl font-black text-amber-400">{s.weight}<span className="text-xs ml-1">lbs</span></div>
                   <div className="text-[10px] font-bold opacity-60 uppercase">{s.reps} Reps</div>
                </div>
              </motion.div>
            )))}
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        <h3 className="text-xs uppercase tracking-widest font-black text-muted-foreground/60">Exercise Performance Breakdown</h3>
        <div className="space-y-4">
          {session.exercises.map((ex, i) => {
            const gradedSets = ex.sets.filter(s => s.type !== 'warmup' && s.grade);
            const wuCount = ex.sets.filter(s => s.type === 'warmup').length;
            const nrCount = ex.sets.filter(s => s.type === 'normal').length;
            const maxCount = ex.sets.filter(s => s.type === 'max').length;
            const bestSet = [...ex.sets].sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))[0];

            return (
              <Card key={i} className="p-5 border-border/40 bg-accent/5 backdrop-blur-sm relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-2xl tracking-tighter uppercase italic">{ex.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] font-black text-muted-foreground uppercase bg-white/5 px-2 py-0.5 rounded">
                         {wuCount} WU · {nrCount} NR · {maxCount} MAX
                       </span>
                    </div>
                  </div>
                  {bestSet?.grade && (
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border-2 border-white/5"
                        style={{ backgroundColor: gradeColor(bestSet.grade), color: 'black' }}
                      >
                        {bestSet.grade}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                  <div className="flex flex-col">
                     <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Best Set</span>
                     <span className="text-lg font-black">{bestSet?.weight}x{bestSet?.reps}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Est. 1RM</span>
                     <span className="text-lg font-black">{Math.round(bestSet?.estimated1RM || 0)} <span className="text-xs font-normal opacity-60">lbs</span></span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-foreground">{bestSet?.gradeLabel}</span>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Top {100 - (bestSet?.percentile || 0)}% percentile</span>
                   </div>
                   {bestSet?.ratio && (
                     <div className="text-[10px] font-black text-[#00E5FF] uppercase bg-[#00E5FF]/10 px-2 py-1 rounded-lg">
                       {bestSet.ratio.toFixed(2)}x BW
                     </div>
                   )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="p-8 bg-accent/20 border-y border-white/5 space-y-6">
        <h3 className="text-center text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">How did you feel?</h3>
        <div className="flex justify-between items-center max-w-sm mx-auto">
          {RATINGS.map((r, i) => (
            <button
              key={i}
              onClick={() => setRating(i)}
              className={cn(
                "flex flex-col items-center gap-2 transition-all duration-300",
                rating === i ? "scale-125 -translate-y-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "opacity-30 grayscale hover:opacity-50"
              )}
            >
              <span className="text-4xl">{r.emoji}</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 space-y-6">
        <Card className="p-8 bg-gradient-to-br from-[#00E5FF]/20 to-transparent border-[#00E5FF]/30 relative overflow-hidden shadow-2xl">
          <Sparkles className="absolute top-4 right-4 h-6 w-6 text-[#00E5FF] opacity-50 animate-pulse" />
          <div className="text-[10px] uppercase font-black text-[#00E5FF] tracking-[0.2em] mb-2">Total Session Reward</div>
          <div className="text-6xl font-black italic tracking-tighter">+{session.xpEarned} <span className="text-2xl not-italic font-bold">XP</span></div>

          <div className="mt-8 space-y-2 border-t border-white/5 pt-4">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>Base Workout Bonus</span> <span>+50 XP</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>Intensity Bonus ({totalSets} sets)</span> <span>+{totalSets * 5} XP</span>
            </div>
            {session.prCount > 0 && (
              <div className="flex justify-between text-[10px] font-black text-[#00E5FF] uppercase tracking-widest">
                <span>PR Bonus ({session.prCount})</span> <span>+{session.prCount * 25} XP</span>
              </div>
            )}
          </div>
        </Card>

        <div className="flex gap-4">
          <Button variant="outline" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest border-2 border-white/5 bg-white/5 hover:bg-white/10">
            <Share2 className="h-5 w-5 mr-2" /> Share
          </Button>
          <Button
            onClick={onClose}
            className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-[0.2em] bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black shadow-lg shadow-[#00E5FF]/20 active:scale-95 transition-transform"
          >
            DONE
          </Button>
        </div>
      </div>
    </div>
  );
};
