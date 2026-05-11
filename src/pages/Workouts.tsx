// @ts-nocheck
import { useEffect, useState } from "react";
import { User, Activity, Heart, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { AthleteProfile, Gender, averageGrade, gradeColor } from "@/lib/athlete";
import {
  fetchAthleteProfile, saveAthleteProfile, fetchUserStats, saveUserStats,
  monthKey, fetchPrefs, savePrefs, fetchRecentSessions, fetchAllTimePRs,
  saveWorkoutSession, fetchPreviousExerciseData
} from "@/lib/workouts";
import { getRank, getNextRank, type Rank } from "@/lib/rank";
import { AthleticProfileBar } from "@/components/profile/AthleticProfileBar";
import { WorkoutHome, WorkoutTemplate } from "@/components/workouts/WorkoutHome";
import { ActiveSession } from "@/components/workouts/ActiveSession";
import { ExercisePicker, Exercise } from "@/components/workouts/ExercisePicker";
import { WorkoutSummary } from "@/components/workouts/WorkoutSummary";

type WorkoutState = "home" | "active" | "summary";

const Workouts = () => {
  const { user } = useAuth();
  const [state, setState] = useState<WorkoutState>("home");
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [xp, setXp] = useState(0);
  const [currentMonth, setCurrentMonth] = useState<string>(monthKey());
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [activeExercises, setActiveExercises] = useState<any[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lastSummary, setLastSummary] = useState<any>(null);
  const [activeInjury, setActiveInjury] = useState<any>(null);
  const [isRecovery, setIsRecovery] = useState(false);

  const loadData = async () => {
    if (!user) return;
    const [p, stats, sessions, allPrs] = await Promise.all([
      fetchAthleteProfile(user.id),
      fetchUserStats(user.id),
      fetchRecentSessions(user.id),
      fetchAllTimePRs(user.id)
    ]);
    setProfile(p || { weightLbs: 150, age: 16, gender: 'male' } as any);
    setXp(stats.xp);
    setCurrentMonth(stats.currentMonth);
    setRecentSessions(sessions);
    setPrs(allPrs);

    // Check for active injury
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: inj } = await (supabase as any).from("injuries")
      .select("body_part,status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (inj) setActiveInjury(inj);
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const startWorkout = (recovery = false) => {
    setActiveExercises([]);
    setIsRecovery(recovery);
    setState("active");
  };

  const selectTemplate = async (t: WorkoutTemplate) => {
    toast.loading(`Loading ${t.name}...`);
    const exercisesWithPrev = await Promise.all(t.exercises.map(async (name) => {
      const prev = await fetchPreviousExerciseData(user!.id, name);
      return {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name,
        category: t.name === "Cardio" ? "Cardio" : "Weights",
        type: t.name === "Cardio" ? "cardio_timed" : "weighted",
        muscle_group: "Multiple",
        sets: [{ id: "1", type: 'normal', weight: "", reps: "", completed: false }],
        previous: prev
      };
    }));
    setActiveExercises(exercisesWithPrev);
    setIsRecovery(false);
    setState("active");
    toast.dismiss();
  };

  const handleAddExercise = (e: Exercise) => {
    fetchPreviousExerciseData(user!.id, e.name).then(prev => {
      setActiveExercises(prevExs => [...prevExs, {
        ...e,
        sets: [{ id: Date.now().toString(), type: 'normal', weight: "", reps: "", completed: false }],
        previous: prev
      }]);
    });
    setPickerOpen(false);
  };

  const finishWorkout = async (session: any) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Athlete Profile</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Age</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Height (ft)</Label><Input type="number" value={ft} onChange={(e) => setFt(e.target.value)} /></div>
            <div><Label className="text-xs">Height (in)</Label><Input type="number" value={inch} onChange={(e) => setInch(e.target.value)} /></div>
          </div>
          <div><Label className="text-xs">Weight (lbs)</Label><Input type="number" value={w} onChange={(e) => setW(e.target.value)} /></div>
          <div>
            <Label className="text-xs">Gender</Label>
            <Select value={g} onValueChange={(v) => setG(v as Gender)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Save profile</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Rank card ----------
const RankCard = ({ rank, xp, next }: { rank: Rank; xp: number; next: Rank | null }) => {
  const progress = next ? Math.min(100, Math.max(0, ((xp - rank.xpRequired) / (next.xpRequired - rank.xpRequired)) * 100)) : 100;
  const xpToNext = next ? next.xpRequired - xp : 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-6 relative overflow-hidden" style={{ borderTop: `3px solid ${rank.color}` }}>
      <div className="absolute inset-0 pointer-events-none opacity-10" style={{ background: `radial-gradient(circle at top right, ${rank.color}, transparent 60%)` }} />
      <div className="relative flex items-center gap-4 flex-wrap">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0" style={{ background: `${rank.color}22`, border: `1px solid ${rank.color}44` }}>
          {rank.icon}
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Current rank</div>
          <div className="text-2xl font-bold" style={{ color: rank.color }}>{rank.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {xp} XP {next ? `· ${xpToNext} XP to ${next.icon} ${next.name}` : "· max rank 🔥"}
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: rank.color }} initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }} />
      </div>
    </div>
  );
};

const RankUpBanner = ({ rank, onDone }: { rank: Rank; onDone: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
    onClick={onDone}>
    <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="rounded-3xl border bg-card px-10 py-12 text-center max-w-sm mx-4 relative overflow-hidden"
      style={{ borderColor: rank.color, boxShadow: `0 0 60px ${rank.color}55` }}>
      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="text-7xl mb-4">{rank.icon}</motion.div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">Rank up!</div>
      <div className="text-3xl font-bold mt-1" style={{ color: rank.color }}>{rank.name}</div>
      <Button onClick={onDone} className="mt-6" style={{ background: rank.color, color: "hsl(var(--background))" }}>
        <Sparkles className="h-4 w-4 mr-1.5" /> Let's go
      </Button>
    </motion.div>
  </motion.div>
);

// ---------- Sport Panel ----------
const SportPanel = ({
  sport, entries, reload, onLog, onPR, profile, weightUnit, setWeightUnit,
}: {
  sport: Sport;
  entries: Entry[];
  reload: () => Promise<void>;
  onLog: (xp: number) => Promise<{ rankedUp: boolean; newRank: Rank } | null>;
  onPR: (xp: number) => Promise<void>;
  profile: AthleteProfile | null;
  weightUnit: WeightUnit;
  setWeightUnit: (u: WeightUnit) => void;
}) => {
  const meta = SPORT_META[sport];
  const defaults = sport === "weightlifting" ? WEIGHTLIFTING_DEFAULTS : RUNNING_DEFAULTS;

  const [exercise, setExercise] = useState(defaults[0]);
  const [customExercise, setCustomExercise] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<Unit>(sport === "weightlifting" ? "lbs" : "seconds");
  const { user } = useAuth();

  const usedExercises = useMemo(
    () => Array.from(new Set([...defaults, ...entries.map((e) => e.exercise)])),
    [entries, defaults],
  );

  const finalExercise = exercise === "__custom__" ? customExercise.trim() : exercise;

  const prs = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const e of entries) {
      const cur = map.get(e.exercise);
      if (!cur) map.set(e.exercise, e);
      else {
        const better = isLowerBetter(e.unit) ? e.value < cur.value : e.value > cur.value;
        if (better) map.set(e.exercise, e);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.exercise.localeCompare(b.exercise));
  }, [entries]);

  const add = async () => {
    if (!user) return;

    // Calculate Summary Stats
    const gradedSets = session.exercises.flatMap((ex: any) => ex.sets.filter((s: any) => s.completed && s.type !== 'warmup'));
    const overallGrade = averageGrade(gradedSets.map((s: any) => s.grade).filter(Boolean));
    const prCount = gradedSets.filter((s: any) => s.isPR).length;

    // XP Calculation
    const baseBonus = session.isRecovery ? 25 : 50;
    const setBonus = gradedSets.length * (session.isRecovery ? 2 : 5);
    const prBonus = prCount * 25;
    const totalXp = baseBonus + setBonus + prBonus;

    const summaryData = {
      ...session,
      overallGrade,
      prCount,
      xpEarned: totalXp,
      totalVolume: session.exercises.reduce((sum: number, ex: any) => {
        return sum + ex.sets.reduce((exSum: number, s: any) => {
          return exSum + (s.completed && s.type !== 'warmup' && !ex.category.includes('Cardio') ? (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0) : 0);
        }, 0);
      }, 0)
    };

    setLastSummary(summaryData);
    setState("summary");

    try {
      await saveWorkoutSession(user.id, summaryData);
      const newXp = xp + totalXp;
      setXp(newXp);
      await saveUserStats(user.id, newXp, currentMonth);
      loadData();
    } catch (e: any) {
      toast.error("Failed to save workout");
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto min-h-screen">
      <AnimatePresence mode="wait">
        {state === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6 md:p-10"
          >
            <header className="flex items-start justify-between gap-4 mb-8 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-black tracking-widest">LifeStack Training</p>
                <h1 className="text-5xl font-black mt-1 italic tracking-tighter">WORKOUTS</h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)} className="rounded-full border-primary/30 bg-primary/5 font-bold">
                  <User className="h-4 w-4 mr-1.5" />
                  {profile ? `${profile.weightLbs} lb` : "Setup Profile"}
                </Button>
              </div>
            </header>

            <AthleticProfileBar />

            <div className="mt-8">
              <WorkoutHome
                onStart={() => startWorkout(false)}
                onSelectTemplate={selectTemplate}
                recentSessions={recentSessions}
                prs={prs}
              />
            </div>
          </motion.div>
        )}

        {state === "active" && (
          <motion.div key="active" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}>
            <ActiveSession
              initialExercises={activeExercises}
              onFinish={finishWorkout}
              onAddExercise={() => setPickerOpen(false)}
              profile={profile}
              activeInjury={activeInjury}
              isRecovery={isRecovery}
              allTimePRs={prs}
            />
          </motion.div>
        )}

        {state === "summary" && lastSummary && (
          <motion.div key="summary" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <WorkoutSummary
              session={lastSummary}
              onClose={() => setState("home")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="p-0 sm:max-w-md h-[80vh] rounded-3xl overflow-hidden border-none shadow-2xl">
          <ExercisePicker
            onSelect={handleAddExercise}
            onCancel={() => setPickerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        onSave={(p: any) => {
          saveAthleteProfile(user!.id, p).then(() => {
            setProfile(p);
            toast.success("Profile updated");
          });
        }}
      />
      {/* History per-exercise */}
      {Array.from(new Set(entries.map((e) => e.exercise))).map((ex) => {
        const data = entries
          .filter((e) => e.exercise === ex)
          .map((e) => ({
            date: new Date(e.loggedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            value: e.value,
            id: e.id,
            isPR: e.isPR,
            unit: e.unit,
          }));
        if (data.length < 1) return null;
        return (
          <div key={ex} className="rounded-xl border border-border bg-card p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-semibold">{ex}</h4>
              <span className="text-xs text-muted-foreground">{data[0].unit}</span>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke={meta.accent} strokeWidth={2.5} dot={{ r: 4, fill: meta.accent }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1">
              <AnimatePresence initial={false}>
                {entries
                  .filter((e) => e.exercise === ex)
                  .slice()
                  .reverse()
                  .slice(0, 4)
                  .map((e) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                      className={cn(
                        "flex items-center gap-2 text-xs px-3 py-2 rounded-md group transition-all duration-300",
                        e.isPR
                          ? "bg-[hsl(var(--gold)/0.10)] border-l-2 border-[hsl(var(--gold))] shadow-[0_0_18px_hsl(var(--gold)/0.20)]"
                          : "border-l-2 border-[hsl(var(--neon)/0.45)]"
                      )}
                      data-testid={e.isPR ? "pr-row" : "set-row"}
                    >
                      {e.grade && <GradeBadge grade={e.grade} />}
                      {e.isPR && (
                        <Trophy
                          className="h-3.5 w-3.5 flex-shrink-0 trophy-bounce"
                          style={{ color: "hsl(var(--gold))", filter: "drop-shadow(0 0 6px hsl(var(--gold)/0.7))" }}
                        />
                      )}
                      <span className={cn("font-stat tracking-wider", e.isPR ? "text-[hsl(var(--gold))]" : "")}>
                        {e.value} {e.unit}
                        {e.addedWeight ? ` +${e.addedWeight.toFixed(0)}lb` : ""}
                      </span>
                      {e.xp !== undefined && <span className="text-muted-foreground scoreboard">· +{e.xp} XP</span>}
                      <span className="ml-auto text-muted-foreground scoreboard">
                        {new Date(e.loggedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => remove(e.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ProfileDialog = ({ open, onOpenChange, profile, onSave }: any) => {
  const [age, setAge] = useState(profile?.age?.toString() ?? "16");
  const [w, setW] = useState(profile?.weightLbs?.toString() ?? "150");
  const [g, setG] = useState<Gender>(profile?.gender ?? "male");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-black italic text-2xl uppercase tracking-tight">Athletic Profile</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground">Age</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="rounded-xl font-bold h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground">Weight (lbs)</Label>
            <Input type="number" value={w} onChange={(e) => setW(e.target.value)} className="rounded-xl font-bold h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground">Gender</Label>
            <Select value={g} onValueChange={(v) => setG(v as Gender)}>
              <SelectTrigger className="rounded-xl font-bold h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onSave({ age: parseInt(age), weightLbs: parseInt(w), gender: g, heightFt: 5, heightIn: 10 })} className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-2xl">Save Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

};

export default Workouts;