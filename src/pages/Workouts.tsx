import { useEffect, useState } from "react";
import { User, Activity, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { AthleteProfile, Gender, gradeWorkout } from "@/lib/athlete";
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

const FN = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

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
    setProfile(p);
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
        type: t.name === "Cardio" ? "cardio_timed" : "weighted",
        muscle_group: "Multiple",
        sets: [{ id: "1", weight: "", reps: "", completed: false }],
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
        sets: [{ id: Date.now().toString(), weight: "", reps: "", completed: false }],
        previous: prev
      }]);
    });
    setPickerOpen(false);
  };

  const finishWorkout = async (session: any) => {
    if (!user) return;
    toast.loading("Calculating results & generating scout notes...");

    let prCount = 0;
    let totalXp = session.isRecovery ? 25 : 50;

    const exercisesWithGrades = session.exercises.map((ex: any) => {
      const setsWithGrades = ex.sets.map((s: any) => {
        if (!s.completed) return s;

        const res = gradeWorkout(ex.name, parseFloat(s.weight) || parseInt(s.reps), (ex.type === 'weighted' ? 'lbs' : 'reps'), 0, profile);
        totalXp += session.isRecovery ? 2 : 5;

        const isPR = prs.some(p => p.exercise_name === ex.name && parseFloat(s.weight) > p.value);
        if (isPR) {
          prCount++;
          totalXp += 25;
        }

        return { ...s, ...res, isPR };
      });
      return { ...ex, sets: setsWithGrades };
    });

    const summaryData = {
      ...session,
      exercises: exercisesWithGrades,
      prCount,
      xpEarned: totalXp,
      totalVolume: session.exercises.reduce((sum: number, ex: any) => {
        return sum + ex.sets.reduce((exSum: number, s: any) => {
          return exSum + (s.completed && !ex.type.includes('cardio') ? (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0) : 0);
        }, 0);
      }, 0)
    };

    // Attempt to generate scout notes
    try {
      const { data: { session: supabaseSession } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
      const scoutPrompt = `You are a professional college scout.
Generate a one-sentence scout note for this athlete's workout performance.
Athlete Profile: Age ${profile?.age}, Gender ${profile?.gender}
Workout: ${session.name}, Volume: ${summaryData.totalVolume}lbs, Exercises: ${summaryData.exercises.map((e: any) => e.name).join(", ")}
PRs Broken: ${prCount}
Focus on their potential and strength development. Keep it professional and motivating.`;

      const resp = await fetch(FN("ace-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseSession?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: scoutPrompt }], userId: user.id }),
      });

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }

      let note = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("data: ")) {
          try { const d = JSON.parse(line.slice(6)); if (d.content) note += d.content; } catch { /* skip */ }
        }
      }
      summaryData.scoutNote = note.trim() || "Strong showing today. Maintain this intensity to reach the next tier.";
    } catch (e) {
      summaryData.scoutNote = "Strong showing today. Maintain this intensity to reach the next tier.";
    }

    setLastSummary(summaryData);
    setState("summary");
    toast.dismiss();

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
    <div className="max-w-5xl mx-auto">
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
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Workouts</p>
                <h1 className="text-4xl font-black mt-1">TRAIN. LOG. LEVEL UP.</h1>
              </div>
              <div className="flex gap-2">
                {activeInjury && (
                  <Button variant="outline" size="sm" onClick={() => startWorkout(true)} className="rounded-full border-green-500/50 text-green-500">
                    <Heart className="h-4 w-4 mr-1.5" /> Recovery
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)} className="rounded-full">
                  <User className="h-4 w-4 mr-1.5" />
                  {profile ? `${profile.weightLbs} lb` : "Setup Profile"}
                </Button>
              </div>
            </header>

            {activeInjury && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                <Activity className="h-5 w-5 text-red-500" />
                <div className="text-sm">
                  <span className="font-bold text-red-500">Active Injury: {activeInjury.body_part}</span>
                  <p className="text-muted-foreground">Take it easy today. Avoid movements that hurt.</p>
                </div>
              </div>
            )}

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
          <motion.div key="active" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }}>
            <ActiveSession
              initialExercises={activeExercises}
              onFinish={finishWorkout}
              onAddExercise={() => setPickerOpen(true)}
              profile={profile}
              activeInjury={activeInjury}
              isRecovery={isRecovery}
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
        <DialogContent className="p-0 sm:max-w-md h-[80vh]">
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
    </div>
  );
};

const ProfileDialog = ({ open, onOpenChange, profile, onSave }: any) => {
  const [age, setAge] = useState(profile?.age?.toString() ?? "16");
  const [w, setW] = useState(profile?.weightLbs?.toString() ?? "150");
  const [g, setG] = useState<Gender>(profile?.gender ?? "male");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Athletic Profile</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Age</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Weight (lbs)</Label>
            <Input type="number" value={w} onChange={(e) => setW(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={g} onValueChange={(v) => setG(v as Gender)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onSave({ age: parseInt(age), weightLbs: parseInt(w), gender: g, heightFt: 5, heightIn: 10 })}>Save Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Workouts;
