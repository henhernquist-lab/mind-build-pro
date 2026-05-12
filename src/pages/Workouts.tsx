// @ts-nocheck
import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { AthleteProfile, Gender, averageGrade } from "@/lib/athlete";
import {
  fetchAthleteProfile, saveAthleteProfile, fetchUserStats, saveUserStats,
  monthKey, fetchRecentSessions, fetchAllTimePRs,
  saveWorkoutSession, fetchPreviousExerciseData
} from "@/lib/workouts";
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
    try {
      const [p, stats, sessions, allPrs] = await Promise.all([
        fetchAthleteProfile(user.id),
        fetchUserStats(user.id),
        fetchRecentSessions(user.id),
        fetchAllTimePRs(user.id),
      ]);
      setProfile(p || ({ weightLbs: 150, age: 16, gender: "male", heightFt: 5, heightIn: 10 } as any));
      setXp(stats.xp);
      setCurrentMonth(stats.currentMonth);
      setRecentSessions(sessions);
      setPrs(allPrs);

      const { supabase } = await import("@/integrations/supabase/client");
      const { data: inj } = await (supabase as any).from("injuries")
        .select("body_part,status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (inj) setActiveInjury(inj);
    } catch (e) {
      console.error("Workouts loadData failed", e);
    }
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const startWorkout = (recovery = false) => {
    setActiveExercises([]);
    setIsRecovery(recovery);
    setState("active");
  };

  const selectTemplate = async (t: WorkoutTemplate) => {
    if (!user) return;
    const exercisesWithPrev = await Promise.all(t.exercises.map(async (name) => {
      const prev = await fetchPreviousExerciseData(user.id, name);
      return {
        id: name.toLowerCase().replace(/\s+/g, "_"),
        name,
        category: t.name === "Cardio" ? "Cardio" : "Weights",
        type: t.name === "Cardio" ? "cardio_timed" : "weighted",
        muscle_group: "Multiple",
        sets: [{ id: "1", type: "normal", weight: "", reps: "", completed: false }],
        previous: prev,
      };
    }));
    setActiveExercises(exercisesWithPrev);
    setIsRecovery(false);
    setState("active");
  };

  const handleAddExercise = (e: Exercise) => {
    if (!user) return;
    fetchPreviousExerciseData(user.id, e.name).then(prev => {
      setActiveExercises(prevExs => [...prevExs, {
        ...e,
        sets: [{ id: Date.now().toString(), type: "normal", weight: "", reps: "", completed: false }],
        previous: prev,
      }]);
    });
    setPickerOpen(false);
  };

  const finishWorkout = async (session: any) => {
    if (!user) return;
    const gradedSets = session.exercises.flatMap((ex: any) => ex.sets.filter((s: any) => s.completed && s.type !== "warmup"));
    const overallGrade = averageGrade(gradedSets.map((s: any) => s.grade).filter(Boolean));
    const prCount = gradedSets.filter((s: any) => s.isPR).length;

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
          return exSum + (s.completed && s.type !== "warmup" && !String(ex.category || "").includes("Cardio") ? (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0) : 0);
        }, 0);
      }, 0),
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
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 md:p-10">
            <header className="flex items-start justify-between gap-4 mb-8 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-normalst text-muted-foreground font-semibold">LifeStack Training</p>
                <h1 className="text-xl font-semibold mt-1 italic tracking-tighter">WORKOUTS</h1>
              </div>
              <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)} className="rounded-full border-primary/30 bg-primary/5 font-semibold">
                <User className="h-4 w-4 mr-1.5" />
                {profile ? `${profile.weightLbs} lb` : "Setup Profile"}
              </Button>
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
              onAddExercise={() => setPickerOpen(true)}
              profile={profile}
              activeInjury={activeInjury}
              isRecovery={isRecovery}
              allTimePRs={prs}
            />
          </motion.div>
        )}

        {state === "summary" && lastSummary && (
          <motion.div key="summary" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <WorkoutSummary session={lastSummary} onClose={() => setState("home")} />
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="p-0 sm:max-w-md h-[80vh] rounded-3xl overflow-hidden border-none shadow-2xl">
          <ExercisePicker onSelect={handleAddExercise} onCancel={() => setPickerOpen(false)} />
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
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-semibold italic text-xl uppercase tracking-tight">Athletic Profile</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Age</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="rounded-xl font-semibold h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Weight (lbs)</Label>
            <Input type="number" value={w} onChange={(e) => setW(e.target.value)} className="rounded-xl font-semibold h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Gender</Label>
            <Select value={g} onValueChange={(v) => setG(v as Gender)}>
              <SelectTrigger className="rounded-xl font-semibold h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onSave({ age: parseInt(age), weightLbs: parseInt(w), gender: g, heightFt: 5, heightIn: 10 })} className="w-full h-14 bg-primary text-primary-foreground font-semibold uppercase tracking-normalst rounded-2xl">Save Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Workouts;
