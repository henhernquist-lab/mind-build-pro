import { useState, useEffect, useRef } from "react";
import { Plus, Check, X, MoreHorizontal, Clock, Dumbbell, Activity, Trash2, AlertTriangle, Timer, StopCircle, Zap, Flame, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Exercise, ExerciseType } from "./ExercisePicker";
import { AthleteProfile, Grade, gradeColor, gradeSet } from "@/lib/athlete";
import { RestTimerBanner } from "./RestTimerBanner";
import { showFloatingXp } from "@/components/fx/FloatingXp";
import { toast } from "sonner";

export type SetType = 'warmup' | 'normal' | 'max';

interface Set {
  id: string;
  type: SetType;
  weight: string;
  reps: string;
  distance?: string;
  completed: boolean;
  grade?: Grade | null;
  gradeLabel?: string;
  gradeColor?: string;
  gradePercentile?: number;
  isPR?: boolean;
  ratio?: number;
  estimated1RM?: number;
}

interface ActiveExercise extends Exercise {
  sets: Set[];
  previous?: string;
}

export const ActiveSession = ({
  initialExercises = [],
  onFinish,
  onAddExercise,
  profile,
  activeInjury,
  isRecovery = false,
  allTimePRs = []
}: {
  initialExercises?: ActiveExercise[];
  onFinish: (session: { name: string; exercises: ActiveExercise[]; duration: number; isRecovery: boolean }) => void;
  onAddExercise: () => void;
  profile: AthleteProfile | null;
  activeInjury?: any;
  isRecovery?: boolean;
  allTimePRs?: any[];
}) => {
  const [name, setName] = useState(isRecovery ? "Recovery Session" : "Afternoon Workout");
  const [exercises, setExercises] = useState<ActiveExercise[]>(initialExercises);
  const [seconds, setSeconds] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(90);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const cycleSetType = (exId: string, setId: string) => {
    setExercises(exs => exs.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id === setId) {
              const types: SetType[] = ['warmup', 'normal', 'max'];
              const nextType = types[(types.indexOf(s.type) + 1) % types.length];
              if (nextType === 'max') {
                toast("Going for a max? Let's get it 💪");
              }
              return { ...s, type: nextType };
            }
            return s;
          })
        };
      }
      return ex;
    }));
  };

  const addSet = (exerciseId: string) => {
    setExercises(exs => exs.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, {
            id: Date.now().toString(),
            type: 'normal',
            weight: lastSet?.weight || "",
            reps: lastSet?.reps || "",
            completed: false
          }]
        };
      }
      return ex;
    }));
  };

  const toggleSet = (exId: string, setId: string) => {
    setExercises(exs => exs.map(ex => {
      if (ex.id === exId) {
        const exName = ex.name;
        const exType = ex.type;
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id === setId) {
              const completed = !s.completed;
              if (completed) {
                // Grading & PR logic
                const weight = parseFloat(s.weight) || 0;
                const reps = parseInt(s.reps) || 0;
                const bw = profile?.weightLbs || 150;
                const age = profile?.age || 16;
                const gender = profile?.gender || 'male';

                const res = gradeSet(exName, weight, reps, bw, age, gender, s.type);

                let isPR = false;
                if (s.type !== 'warmup') {
                  const priorBest = allTimePRs.find(p => p.exercise_id === ex.id || p.exercise_name === ex.name)?.value || 0;
                  if (weight > priorBest) {
                    isPR = true;
                    toast.success(`🏆 NEW PR! ${weight} lbs`);
                  }
                  showFloatingXp(isPR ? 50 : 10);
                }

                // Rest timer
                if (s.type !== 'warmup') {
                   const isCompound = ['Squat', 'Deadlift', 'Bench Press'].some(c => exName.includes(c));
                   setRestTimerDuration(isCompound ? 120 : (exType === 'weighted' ? 90 : 60));
                   setShowRestTimer(true);
                }

                return {
                  ...s,
                  completed,
                  grade: res.grade as Grade,
                  gradeLabel: res.level || res.label,
                  gradeColor: res.color,
                  gradePercentile: res.percentile,
                  ratio: res.ratio,
                  estimated1RM: res.estimated1RM,
                  isPR
                };
              }
              return { ...s, completed };
            }
            return s;
          })
        };
      }
      return ex;
    }));
  };

  const updateSet = (exId: string, setId: string, field: keyof Set, value: any) => {
    setExercises(exs => exs.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
        };
      }
      return ex;
    }));
  };

  // Live volume calculation
  useEffect(() => {
    const vol = exercises.reduce((sum, ex) => {
      return sum + ex.sets.reduce((exSum, set) => {
        if (set.completed && set.type !== 'warmup' && set.weight && set.reps && !ex.category.includes('Cardio')) {
          return exSum + (parseFloat(set.weight) * parseInt(set.reps));
        }
        return exSum;
      }, 0);
    }, 0);
    setTotalVolume(vol);
  }, [exercises]);

  const checkInjuryRisk = (exerciseName: string) => {
    if (!activeInjury) return false;
    const bodyPart = activeInjury.body_part.toLowerCase();
    const ex = exerciseName.toLowerCase();
    if (bodyPart.includes('knee') || bodyPart.includes('ankle') || bodyPart.includes('hip')) {
      return ex.includes('squat') || ex.includes('lunges') || ex.includes('leg press') || ex.includes('run');
    }
    if (bodyPart.includes('shoulder') || bodyPart.includes('elbow') || bodyPart.includes('wrist')) {
      return ex.includes('press') || ex.includes('bench') || ex.includes('push-up');
    }
    if (bodyPart.includes('back')) {
      return ex.includes('deadlift') || ex.includes('row') || ex.includes('squat');
    }
    return false;
  };

  return (
    <div className="min-h-screen pb-32 bg-background">
      {showRestTimer && <RestTimerBanner duration={restTimerDuration} onClose={() => setShowRestTimer(false)} />}

      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b p-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0 w-2/3 uppercase italic tracking-tighter"
          />
          <Button
            onClick={() => onFinish({ name, exercises, duration: seconds, isRecovery })}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 rounded-xl animate-pulse shadow-lg shadow-red-600/20"
          >
            FINISH
          </Button>
        </div>
        <div className="flex items-center gap-8">
          <div>
            <div className="text-[10px] uppercase tracking-normalst text-muted-foreground font-semibold">Session Timer</div>
            <div className="text-xl font-mono font-semibold tabular-nums">{formatTime(seconds)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-normalst text-muted-foreground font-semibold">Total Volume</div>
            <div className="text-xl font-mono font-semibold text-[#00E5FF] tabular-nums">{totalVolume.toLocaleString()} <span className="text-sm font-semibold">lbs</span></div>
          </div>
        </div>
      </div>

      {!profile && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-semibold text-center">
          Complete your Athletic Profile for accurate grades
        </div>
      )}

      <div className="p-4 space-y-6">
        <AnimatePresence>
          {exercises.map((ex) => {
            const hasRisk = checkInjuryRisk(ex.name);
            const isCardio = ex.category === 'Cardio';

            return (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className={cn("overflow-hidden border-2 bg-card/50 backdrop-blur-sm shadow-xl", hasRisk ? "border-amber-500/50" : "border-border/50")}>
                  <div className="p-4 flex items-center justify-between bg-accent/20 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                        {isCardio ? <Activity className="h-5 w-5 text-primary" /> : <Dumbbell className="h-5 w-5 text-primary" />}
                      </div>
                      <h3 className="font-semibold text-xl tracking-tight uppercase italic">{ex.name}</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => addSet(ex.id)} className="h-10 w-10 bg-accent/40 rounded-xl border border-border/50">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>

                  {hasRisk && (
                    <div className="px-4 py-2 bg-amber-500/10 text-amber-500 text-[10px] font-semibold uppercase flex items-center gap-2 border-b border-amber-500/20">
                      <AlertTriangle className="h-3 w-3" />
                      ⚠️ THIS EXERCISE MAY AFFECT YOUR {activeInjury.body_part} INJURY
                    </div>
                  )}

                  <div className="p-4">
                    <div className="grid grid-cols-[60px_40px_1fr_80px_80px_40px] gap-2 mb-3 text-[10px] uppercase font-semibold text-muted-foreground/60 px-1 tracking-normalst">
                      <div>Type</div>
                      <div className="text-center">Set</div>
                      <div>Previous</div>
                      <div className="text-center">{isCardio ? 'Dist' : 'lbs'}</div>
                      <div className="text-center">{isCardio ? 'Time' : 'Reps'}</div>
                      <div></div>
                    </div>

                    <div className="space-y-3">
                      {ex.sets.map((set, sIdx) => (
                        <div key={set.id} className="space-y-2 group">
                          <div className={cn(
                            "grid grid-cols-[60px_40px_1fr_80px_80px_40px] gap-2 items-center p-1 rounded-xl transition-all duration-300",
                            set.completed ? "bg-green-500/10" : "hover:bg-accent/30",
                            set.type === 'warmup' ? 'opacity-60' : '',
                            set.type === 'max' && !set.completed ? 'ring-2 ring-amber-400/30' : ''
                          )}>
                            <button
                              onClick={() => cycleSetType(ex.id, set.id)}
                              className={cn(
                                "h-8 rounded-lg text-[10px] font-semibold transition-all border",
                                set.type === 'warmup' ? "bg-slate-500/20 text-slate-400 border-slate-500/30" :
                                set.type === 'normal' ? "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30" :
                                "bg-amber-400/20 text-amber-400 border-amber-400/30 animate-pulse"
                              )}
                            >
                              {set.type === 'warmup' ? '🔥WU' : set.type === 'normal' ? '💪NR' : '⚡MAX'}
                            </button>

                            <div className="text-center font-semibold text-sm tabular-nums opacity-60">{sIdx + 1}</div>

                            <div className="text-xs text-muted-foreground font-semibold truncate opacity-60">{ex.previous || "—"}</div>

                            <Input
                              type="number"
                              inputMode="decimal"
                              value={set.weight}
                              onChange={e => updateSet(ex.id, set.id, 'weight', e.target.value)}
                              placeholder="0"
                              className="h-9 text-center bg-accent/40 border-none font-semibold text-base rounded-lg focus:ring-1 focus:ring-primary/50"
                            />

                            <Input
                              type={isCardio ? "text" : "number"}
                              inputMode={isCardio ? "text" : "numeric"}
                              value={set.reps}
                              onChange={e => updateSet(ex.id, set.id, 'reps', e.target.value)}
                              placeholder={isCardio ? "MM:SS" : "0"}
                              className="h-9 text-center bg-accent/40 border-none font-semibold text-base rounded-lg focus:ring-1 focus:ring-primary/50"
                            />

                            <button
                              onClick={() => toggleSet(ex.id, set.id)}
                              className={cn(
                                "h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-lg",
                                set.completed ? "bg-green-500 text-white scale-90" : "bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black active:scale-95"
                              )}
                            >
                              <Check className="h-5 w-5 stroke-[4]" />
                            </button>
                          </div>

                          {/* Set Result UI */}
                          {set.completed && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="px-12 pb-2"
                            >
                              <div className="flex flex-col gap-1 border-l-2 border-primary/30 pl-4 py-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={cn(
                                        "h-8 min-w-[36px] px-2 rounded-lg flex items-center justify-center font-semibold text-base shadow-lg transition-all",
                                        set.type === 'max' ? 'scale-125 mx-2 ring-2 ring-amber-400 ring-offset-2 ring-offset-background glow-gold' : ''
                                      )}
                                      style={{
                                        backgroundColor: set.gradeColor,
                                        color: 'black',
                                        filter: set.type === 'max' ? `drop-shadow(0 0 8px ${set.gradeColor})` : ''
                                      }}
                                    >
                                      {set.grade || (set.type === 'warmup' ? 'WU' : '—')}
                                    </div>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-semibold text-foreground uppercase tracking-normalr">{set.gradeLabel}</span>
                                        <span className="text-muted-foreground/50">|</span>
                                        <span className="text-[8px] font-semibold text-muted-foreground uppercase">Top {100 - (set.gradePercentile || 0)}% for your age</span>
                                      </div>
                                      {set.type !== 'warmup' && (
                                        <div className="text-[8px] font-medium text-muted-foreground/60 uppercase">
                                          Estimated 1RM: {Math.round(set.estimated1RM || 0)} lbs  |  Ratio: {(set.ratio || 0).toFixed(2)}x bodyweight
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {set.isPR && (
                                    <div className="flex items-center gap-1 bg-amber-400/20 text-amber-400 px-2 py-1 rounded-md animate-bounce border border-amber-400/30 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                                      <Trophy className="h-3 w-3" />
                                      <span className="text-[10px] font-semibold uppercase">New PR</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {!set.completed && set.type === 'max' && (
                             <div className="px-12 pb-2">
                               <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                                 <Zap className="h-3 w-3 text-amber-400" />
                                 <span className="text-[9px] font-semibold text-amber-400 uppercase tracking-normalst animate-pulse">Max Attempt Detected — Let's go!</span>
                               </div>
                             </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-accent/20 border-dashed border-primary/30 h-10 font-semibold uppercase text-[10px] tracking-normalst hover:bg-primary/10 transition-colors"
                        onClick={() => addSet(ex.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Set
                      </Button>
                    </div>

                    {ex.sets.some(s => s.completed) && (
                      <div className="mt-4 pt-3 border-t border-border/30 flex justify-between items-center text-[10px] font-semibold text-muted-foreground uppercase tracking-normalst">
                         <span>Best this session:</span>
                         <span className="text-foreground">
                           {ex.sets.filter(s => s.completed).sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight))[0]?.weight} lbs × {ex.sets.filter(s => s.completed).sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight))[0]?.reps} reps
                         </span>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <Button
          variant="outline"
          className="w-full h-20 border-2 border-dashed border-[#00E5FF]/30 text-[#00E5FF] font-semibold uppercase tracking-normalst rounded-3xl hover:bg-[#00E5FF]/5 transition-all shadow-inner"
          onClick={onAddExercise}
        >
          <Plus className="h-6 w-6 mr-3" /> Add Exercise
        </Button>
      </div>
    </div>
  );
};
