import { useState, useEffect, useRef } from "react";
import { Plus, Check, X, MoreHorizontal, Clock, Dumbbell, Activity, Trash2, AlertTriangle, Timer, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Exercise, ExerciseType } from "./ExercisePicker";
import { AthleteProfile, Grade, gradeColor, gradeWorkout } from "@/lib/athlete";
import { RestTimerBanner } from "./RestTimerBanner";

interface Set {
  id: string;
  weight: string;
  reps: string;
  time?: string;
  distance?: string;
  completed: boolean;
  grade?: Grade;
  isPR?: boolean;
  splits?: string[];
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
}: {
  initialExercises?: ActiveExercise[];
  onFinish: (session: { name: string; exercises: ActiveExercise[]; duration: number; isRecovery: boolean }) => void;
  onAddExercise: () => void;
  profile: AthleteProfile | null;
  activeInjury?: any;
  isRecovery?: boolean;
}) => {
  const [name, setName] = useState(isRecovery ? "Recovery Session" : "Afternoon Workout");
  const [exercises, setExercises] = useState<ActiveExercise[]>(initialExercises);
  const [seconds, setSeconds] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);

  // Lap timer state
  const [lapRunning, setLapRunning] = useState<string | null>(null);
  const [lapSeconds, setLapSeconds] = useState(0);
  const lapInterval = useRef<any>(null);

  // Main session timer
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

  const formatLapTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.0`;
  };

  const startLap = (setId: string) => {
    if (lapRunning) return;
    setLapRunning(setId);
    setLapSeconds(0);
    lapInterval.current = setInterval(() => setLapSeconds(s => s + 1), 1000);
  };

  const stopLap = (exId: string, setId: string) => {
    clearInterval(lapInterval.current);
    const finalTime = formatLapTime(lapSeconds);
    updateSet(exId, setId, 'reps', finalTime);
    setLapRunning(null);
  };

  const addSet = (exerciseId: string) => {
    setExercises(exs => exs.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, {
            id: Date.now().toString(),
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
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id === setId) {
              const completed = !s.completed;
              if (completed) {
                setShowRestTimer(true);
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
        if (set.completed && set.weight && set.reps && !ex.type.includes('cardio')) {
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
    <div className="min-h-screen pb-32">
      {showRestTimer && <RestTimerBanner onClose={() => setShowRestTimer(false)} />}

      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-xl font-black bg-transparent border-none p-0 h-auto focus-visible:ring-0 w-full"
            />
            {isRecovery && <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Recovery Mode (50% XP)</span>}
          </div>
          <Button
            onClick={() => onFinish({ name, exercises, duration: seconds, isRecovery })}
            className="bg-red-600 hover:bg-red-700 text-white font-bold shrink-0 ml-4"
          >
            Finish
          </Button>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Timer</div>
            <div className="text-2xl font-mono font-black">{formatTime(seconds)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Volume</div>
            <div className="text-2xl font-mono font-black text-[#00E5FF]">{totalVolume.toLocaleString()} <span className="text-xs">lbs</span></div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <AnimatePresence>
          {exercises.map((ex) => {
            const hasRisk = checkInjuryRisk(ex.name);
            const isCardio = ex.type.includes('cardio');
            const isTimed = ex.type === 'timed';
            const isDistance = ex.type === 'cardio_distance';

            return (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className={cn("overflow-hidden border-2", hasRisk ? "border-amber-500/50" : "")}>
                  <div className="p-4 flex items-center justify-between bg-accent/20">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        {isCardio ? <Activity className="h-4 w-4 text-primary" /> : <Dumbbell className="h-4 w-4 text-primary" />}
                      </div>
                      <h3 className="font-black text-lg">{ex.name}</h3>
                    </div>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-5 w-5" /></Button>
                  </div>

                  {hasRisk && (
                    <div className="px-4 py-2 bg-amber-500/10 text-amber-500 text-[10px] font-bold flex items-center gap-2 border-y border-amber-500/20">
                      <AlertTriangle className="h-3 w-3" />
                      ⚠️ This exercise may affect your {activeInjury.body_part} injury — proceed carefully
                    </div>
                  )}

                  <div className="p-4">
                    <div className="grid grid-cols-[30px_1fr_90px_90px_40px] gap-2 mb-2 text-[10px] uppercase font-bold text-muted-foreground px-1">
                      <div>Set</div>
                      <div>Previous</div>
                      <div className="text-center">
                        {isCardio ? (isDistance ? 'Time' : 'Dist') : (isTimed ? 'Sec' : 'lbs')}
                      </div>
                      <div className="text-center">
                        {isCardio ? (isDistance ? 'Dist' : 'Time') : 'Reps'}
                      </div>
                      <div></div>
                    </div>

                    <div className="space-y-2">
                      {ex.sets.map((set, sIdx) => (
                        <div key={set.id} className="space-y-2">
                          <div className={cn(
                            "grid grid-cols-[30px_1fr_90px_90px_40px] gap-2 items-center p-1 rounded-lg transition-colors",
                            set.completed ? "bg-green-500/10" : ""
                          )}>
                            <div className="text-center font-bold text-sm">{sIdx + 1}</div>
                            <div className="text-xs text-muted-foreground truncate">{ex.previous || "—"}</div>

                            {/* Input 1: lbs or Sec or Distance Dropdown */}
                            {ex.type === 'cardio_timed' ? (
                               <Select value={set.distance} onValueChange={v => updateSet(ex.id, set.id, 'distance', v)}>
                                 <SelectTrigger className="h-8 text-xs bg-accent/40 border-none">
                                   <SelectValue placeholder="Dist" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="40yd">40yd</SelectItem>
                                   <SelectItem value="100m">100m</SelectItem>
                                   <SelectItem value="200m">200m</SelectItem>
                                   <SelectItem value="400m">400m</SelectItem>
                                   <SelectItem value="800m">800m</SelectItem>
                                   <SelectItem value="Mile">Mile</SelectItem>
                                   <SelectItem value="5K">5K</SelectItem>
                                   <SelectItem value="Custom">Custom</SelectItem>
                                 </SelectContent>
                               </Select>
                            ) : (
                              <Input
                                value={set.weight}
                                onChange={e => updateSet(ex.id, set.id, 'weight', e.target.value)}
                                placeholder="0"
                                className="h-8 text-center bg-accent/40 border-none"
                              />
                            )}

                            {/* Input 2: Reps or Time */}
                            <div className="relative">
                              <Input
                                value={set.reps}
                                onChange={e => updateSet(ex.id, set.id, 'reps', e.target.value)}
                                placeholder={isCardio ? "MM:SS.ms" : "0"}
                                className={cn(
                                  "h-8 text-center bg-accent/40 border-none",
                                  isCardio && "pr-6"
                                )}
                              />
                              {isCardio && !set.completed && (
                                <button
                                  onClick={() => lapRunning === set.id ? stopLap(ex.id, set.id) : startLap(set.id)}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[#00E5FF]"
                                >
                                  {lapRunning === set.id ? <StopCircle className="h-4 w-4 animate-pulse" /> : <Timer className="h-4 w-4" />}
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => toggleSet(ex.id, set.id)}
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                                set.completed ? "bg-green-500 text-white" : "bg-accent hover:bg-accent/80"
                              )}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Set Grade/Result UI if completed */}
                          {set.completed && profile && (
                            <div className="px-10 pb-2">
                               <SetGradeDetail exercise={ex} set={set} profile={profile} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-accent/20 border-none h-9 font-bold"
                        onClick={() => addSet(ex.id)}
                      >
                        + Add Set
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <Button
          variant="outline"
          className="w-full h-14 border-2 border-dashed border-[#00E5FF]/30 text-[#00E5FF] font-bold"
          onClick={onAddExercise}
        >
          <Plus className="h-5 w-5 mr-2" /> ADD EXERCISE
        </Button>
      </div>
    </div>
  );
};

const SetGradeDetail = ({ exercise, set, profile }: { exercise: ActiveExercise, set: Set, profile: AthleteProfile }) => {
  const weight = parseFloat(set.weight) || 0;
  const reps = parseInt(set.reps) || 0;

  const res = gradeWorkout(exercise.name, weight || reps, (exercise.type === 'weighted' ? 'lbs' : 'reps'), 0, profile);

  if (!res) return null;

  return (
    <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-5 min-w-[24px] px-1 rounded flex items-center justify-center font-black text-[10px]"
            style={{ backgroundColor: gradeColor(res.grade), color: 'black' }}
          >
            {res.grade}
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">{res.level}</span>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground">Top {100 - res.percentile}%</span>
      </div>

      <div className="h-1 w-full bg-accent/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-1000"
          style={{ width: `${res.percentile}%`, backgroundColor: gradeColor(res.grade) }}
        />
      </div>

      {res.ratio && (
        <div className="text-[9px] text-muted-foreground italic">
          You lifted {res.ratio.toFixed(2)}x your bodyweight
        </div>
      )}

      {res.target && (
        <div className="text-[9px] text-[#00E5FF] font-bold">
          Target: {res.target}
        </div>
      )}
    </div>
  );
};
