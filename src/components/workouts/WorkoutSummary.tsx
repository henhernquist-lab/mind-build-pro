import { useEffect, useState } from "react";
import { Trophy, Clock, Dumbbell, Star, Share2, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { Grade, gradeColor } from "@/lib/athlete";

interface SessionExercise {
  name: string;
  sets: { weight: string; reps: string; grade?: Grade; isPR?: boolean; level?: string; percentile?: number; ratio?: number }[];
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
    <div className="min-h-screen bg-background pb-20 animate-in fade-in zoom-in-95 duration-500">
      <div className="p-6 text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="mx-auto h-20 w-20 rounded-full bg-amber-400 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.4)]"
        >
          <Trophy className="h-10 w-10 text-black" />
        </motion.div>

        <h1 className="text-3xl font-black italic">{session.isRecovery ? "RECOVERY SESSION COMPLETE!" : "WORKOUT COMPLETE!"}</h1>
        <p className="text-[#00E5FF] font-bold tracking-widest uppercase text-sm">Session: {session.name}</p>
      </div>

      <div className="px-4 grid grid-cols-2 gap-4">
        <Card className="p-4 bg-accent/20 border-none">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-1">
            <Clock className="h-3 w-3" /> Duration
          </div>
          <div className="text-2xl font-black">{Math.floor(session.duration / 60)}:{(session.duration % 60).toString().padStart(2, '0')}</div>
        </Card>
        <Card className="p-4 bg-accent/20 border-none">
          <div className="flex items-center gap-2 text-[#00E5FF] text-xs uppercase font-bold mb-1">
            <Dumbbell className="h-3 w-3" /> Volume
          </div>
          <div className="text-2xl font-black">{session.totalVolume.toLocaleString()} <span className="text-sm font-bold">lbs</span></div>
        </Card>
        <Card className="p-4 bg-accent/20 border-none">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-1">
            Sets
          </div>
          <div className="text-2xl font-black">{totalSets}</div>
        </Card>
        <Card className="p-4 bg-accent/20 border-none">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-1">
            Reps
          </div>
          <div className="text-2xl font-black">{totalReps}</div>
        </Card>
      </div>

      {session.prCount > 0 && (
        <div className="p-6">
           <h3 className="text-sm uppercase tracking-widest font-black text-amber-400 mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4" /> {session.prCount} PRs BROKEN!
          </h3>
          <div className="space-y-3">
            {session.exercises.map(ex => ex.sets.map((s, i) => s.isPR && (
              <Card key={`${ex.name}-${i}`} className="p-4 bg-gradient-to-r from-amber-400/20 to-transparent border-amber-400/30">
                <div className="text-[10px] uppercase font-bold text-amber-400">Personal Record</div>
                <div className="text-lg font-black">{ex.name}</div>
                <div className="text-sm font-bold opacity-80">{s.weight} lbs × {s.reps} reps</div>
              </Card>
            )))}
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        <h3 className="text-sm uppercase tracking-widest font-black text-muted-foreground">Exercise Breakdown</h3>
        <div className="space-y-4">
          {session.exercises.map((ex, i) => {
            const bestSet = [...ex.sets].sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))[0];
            return (
              <Card key={i} className="p-4 overflow-hidden relative border-none bg-accent/10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-black text-lg">{ex.name}</h4>
                    <p className="text-xs text-muted-foreground uppercase">{ex.muscle_group}</p>
                  </div>
                  {bestSet?.grade && (
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-lg shadow-lg"
                        style={{ backgroundColor: gradeColor(bestSet.grade), color: 'black' }}
                      >
                        {bestSet.grade}
                      </div>
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">{bestSet.level}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 text-sm font-bold mt-4">
                  <div><span className="text-muted-foreground mr-1 uppercase text-[10px]">Sets</span> {ex.sets.length}</div>
                  <div><span className="text-muted-foreground mr-1 uppercase text-[10px]">Best</span> {bestSet?.weight}x{bestSet?.reps}</div>
                  {bestSet?.percentile && (
                    <div className="ml-auto text-[10px] font-black text-[#00E5FF]">TOP {100 - bestSet.percentile}%</div>
                  )}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-background/50 border border-border/50">
                   <p className="text-[10px] italic text-muted-foreground">
                    <Sparkles className="h-3 w-3 inline mr-1 text-[#00E5FF]" />
                    {session.scoutNote || (bestSet?.grade && bestSet.grade.startsWith('A')
                      ? "Incredible power display. This student-athlete is showing elite potential for their age group."
                      : "Solid progress. Focus on consistent volume to move into the next grade tier.")}
                   </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="p-6 bg-accent/10 border-y space-y-4">
        <h3 className="text-center text-xs uppercase tracking-widest font-black text-muted-foreground">How did it feel?</h3>
        <div className="flex justify-between items-center px-2">
          {RATINGS.map((r, i) => (
            <button
              key={i}
              onClick={() => setRating(i)}
              className={cn(
                "flex flex-col items-center gap-1 transition-transform active:scale-90",
                rating === i ? "scale-125" : "opacity-40 grayscale"
              )}
            >
              <span className="text-3xl">{r.emoji}</span>
              <span className="text-[10px] font-bold uppercase">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        <Card className="p-6 bg-[#00E5FF]/10 border-[#00E5FF]/30 relative overflow-hidden">
          <Sparkles className="absolute top-2 right-2 h-4 w-4 text-[#00E5FF] opacity-50" />
          <div className="text-xs uppercase font-black text-[#00E5FF] mb-1">XP EARNED</div>
          <div className="text-4xl font-black">+{session.xpEarned} XP</div>
          <div className="mt-3 text-[10px] text-muted-foreground space-y-1">
            <div className="flex justify-between"><span>Base Session</span> <span>+{session.isRecovery ? 25 : 50} XP</span></div>
            <div className="flex justify-between"><span>Workouts Completed</span> <span>+{totalSets * (session.isRecovery ? 2 : 5)} XP</span></div>
            {session.prCount > 0 && (
              <div className="flex justify-between text-[#00E5FF] font-bold"><span>PR Bonus ({session.prCount})</span> <span>+{session.prCount * 25} XP</span></div>
            )}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-12 font-bold gap-2">
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button onClick={onClose} className="flex-[2] h-12 font-black bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black">
            DONE
          </Button>
        </div>
      </div>
    </div>
  );
};
