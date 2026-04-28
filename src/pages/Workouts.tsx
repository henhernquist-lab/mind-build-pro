import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, Trash2, Sparkles, User, Dumbbell, Footprints } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AthleteProfile, Gender, Grade, gradeColor, gradeWorkout, averageGrade,
  WeightUnit, toLbs, Unit,
} from "@/lib/athlete";
import {
  Sport, Entry, fetchEntries, insertEntry, deleteEntry,
  fetchAthleteProfile, saveAthleteProfile,
  fetchUserStats, saveUserStats, fetchRankHistory, insertRankHistory, monthKey,
  fetchPrefs, savePrefs,
} from "@/lib/workouts";
import { useAuth } from "@/lib/auth";
import { RANKS, getRank, getNextRank, XP_PR_BONUS, type Rank } from "@/lib/rank";
import { AthleticProfileBar } from "@/components/profile/AthleticProfileBar";

const isLowerBetter = (u: Unit) => u === "seconds" || u === "minutes";

const SPORT_META: Record<Sport, { label: string; emoji: string; icon: typeof Dumbbell; accent: string; defaultUnit: Unit }> = {
  weightlifting: { label: "Weightlifting", emoji: "🏋️", icon: Dumbbell, accent: "hsl(var(--sports))", defaultUnit: "lbs" },
  running:       { label: "Running",       emoji: "🏃", icon: Footprints, accent: "hsl(var(--primary))", defaultUnit: "seconds" },
};

const WEIGHTLIFTING_DEFAULTS = ["Bench press", "Squat", "Push-ups", "Pull-ups", "Deadlift"];
const RUNNING_DEFAULTS = ["40-yard dash", "100m", "200m", "400m", "Mile run", "Shuttle run"];

// ---------- Grade Badge ----------
const GradeBadge = ({ grade }: { grade: Grade }) => (
  <span
    className="inline-flex items-center justify-center h-6 min-w-[28px] px-1.5 rounded-md text-[11px] font-bold tabular-nums"
    style={{ background: gradeColor(grade), color: "hsl(var(--background))" }}
  >
    {grade}
  </span>
);

// ---------- Profile Dialog ----------
const ProfileDialog = ({
  open, onOpenChange, profile, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: AthleteProfile | null;
  onSave: (p: AthleteProfile) => void;
}) => {
  const [age, setAge] = useState(profile?.age?.toString() ?? "13");
  const [ft, setFt] = useState(profile?.heightFt?.toString() ?? "5");
  const [inch, setInch] = useState(profile?.heightIn?.toString() ?? "6");
  const [w, setW] = useState(profile?.weightLbs?.toString() ?? "120");
  const [g, setG] = useState<Gender>(profile?.gender ?? "male");

  const save = () => {
    onSave({
      age: parseInt(age) || 13,
      heightFt: parseInt(ft) || 5,
      heightIn: parseInt(inch) || 0,
      weightLbs: parseInt(w) || 120,
      gender: g,
    });
    onOpenChange(false);
  };

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
    if (!finalExercise) { toast.error("Pick an exercise"); return; }

    // Determine primary value + unit
    let primaryValue: number;
    let primaryUnit: Unit;
    let addedWeightLbs = 0;

    if (sport === "weightlifting") {
      // Reps + weight. Primary value = reps (reps-based), or weight if no reps entered.
      const r = parseFloat(reps);
      const w = parseFloat(weight);
      const wLbs = !isNaN(w) ? toLbs(w, weightUnit) : 0;
      if (!isNaN(r) && r > 0) {
        primaryValue = r;
        primaryUnit = "reps";
        addedWeightLbs = wLbs;
      } else if (!isNaN(w) && w > 0) {
        // Pure lift: log as weight (converted to lbs)
        primaryValue = wLbs;
        primaryUnit = "lbs";
      } else {
        toast.error("Enter reps or weight");
        return;
      }
    } else {
      // Running: value in chosen unit (seconds/minutes/yards)
      const v = parseFloat(reps); // reps input doubles as "time/distance" value in running
      if (isNaN(v)) { toast.error("Enter a value"); return; }
      primaryValue = v;
      primaryUnit = unit;
    }

    // PR detection
    const prior = entries.filter((e) => e.exercise.toLowerCase() === finalExercise.toLowerCase() && e.unit === primaryUnit);
    let isPR = true;
    if (prior.length > 0) {
      const best = prior.reduce((acc, x) =>
        (isLowerBetter(primaryUnit) ? x.value < acc.value : x.value > acc.value) ? x : acc,
      );
      isPR = isLowerBetter(primaryUnit) ? primaryValue < best.value : primaryValue > best.value;
    }

    const result = profile ? gradeWorkout(finalExercise, primaryValue, primaryUnit, addedWeightLbs, profile) : null;

    try {
      await insertEntry(user.id, {
        sport,
        exercise: finalExercise,
        value: primaryValue,
        unit: primaryUnit,
        addedWeight: addedWeightLbs || undefined,
        isPR,
        grade: result?.grade,
        xp: result?.xp,
        note: result?.note,
        breakdown: result?.breakdown,
      });
      setReps("");
      setWeight("");
      setCustomExercise("");
      await reload();
      const xp = result?.xp ?? 10;
      await onLog(xp);
      if (isPR) {
        toast.success(`🏆 New PR on ${finalExercise}!`);
        await onPR(xp);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Could not log workout");
    }
  };

  const remove = async (id: string) => {
    await deleteEntry(id);
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">Exercise</Label>
          <Select value={exercise} onValueChange={setExercise}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {usedExercises.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              <SelectItem value="__custom__">➕ Custom…</SelectItem>
            </SelectContent>
          </Select>
          {exercise === "__custom__" && (
            <Input
              className="mt-1.5"
              value={customExercise}
              onChange={(e) => setCustomExercise(e.target.value)}
              placeholder={sport === "weightlifting" ? "e.g. Incline bench" : "e.g. 800m"}
            />
          )}
        </div>

        {sport === "weightlifting" ? (
          <>
            <div>
              <Label className="text-[11px] text-muted-foreground">Reps</Label>
              <Input type="number" step="1" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="0" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[11px] text-muted-foreground">Weight (optional for bodyweight reps)</Label>
                <div className="inline-flex rounded-full border border-border p-0.5 text-[10px] font-semibold">
                  {(["lbs", "kg"] as WeightUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setWeightUnit(u)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full transition-colors uppercase",
                        weightUnit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <Input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={`0 ${weightUnit}`} />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label className="text-[11px] text-muted-foreground">Value</Label>
              <Input type="number" step="0.01" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">seconds</SelectItem>
                  <SelectItem value="minutes">minutes</SelectItem>
                  <SelectItem value="yards">yards</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Button onClick={add} className="w-full" style={{ backgroundColor: meta.accent, color: "hsl(var(--background))" }}>
          <Plus className="h-4 w-4 mr-1" /> Log workout
        </Button>
      </div>

      {/* PRs */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4" style={{ color: meta.accent }} /> All-time PRs
        </h3>
        {prs.length === 0 ? (
          <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-6 text-center">
            Log your first exercise to start tracking PRs.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {prs.map((pr) => (
              <div key={pr.id} className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">{pr.exercise}</div>
                <div className="text-2xl font-bold mt-1" style={{ color: meta.accent }}>
                  {pr.value} <span className="text-sm font-normal text-muted-foreground">{pr.unit}</span>
                </div>
                {pr.addedWeight ? (
                  <div className="text-[10px] text-muted-foreground">+{pr.addedWeight.toFixed(0)} lbs added</div>
                ) : null}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(pr.loggedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn("flex items-center gap-2 text-xs px-3 py-2 rounded-md group", e.isPR && "bg-accent")}
                    >
                      {e.grade && <GradeBadge grade={e.grade} />}
                      {e.isPR && <Trophy className="h-3 w-3 flex-shrink-0" style={{ color: meta.accent }} />}
                      <span className="font-medium">
                        {e.value} {e.unit}
                        {e.addedWeight ? ` +${e.addedWeight.toFixed(0)}lb` : ""}
                      </span>
                      {e.xp !== undefined && <span className="text-muted-foreground">· +{e.xp} XP</span>}
                      <span className="ml-auto text-muted-foreground">
                        {new Date(e.loggedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => remove(e.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
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

// ---------- Page ----------
const Workouts = () => {
  const { user } = useAuth();
  const [sport, setSport] = useState<Sport>("weightlifting");
  const [lifting, setLifting] = useState<Entry[]>([]);
  const [running, setRunning] = useState<Entry[]>([]);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [xp, setXp] = useState(0);
  const [currentMonth, setCurrentMonth] = useState<string>(monthKey());
  const [rankUp, setRankUp] = useState<Rank | null>(null);
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>("lbs");

  const reloadLifting = async () => { if (user) setLifting(await fetchEntries(user.id, "weightlifting")); };
  const reloadRunning = async () => { if (user) setRunning(await fetchEntries(user.id, "running")); };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, stats, prefs] = await Promise.all([
        fetchAthleteProfile(user.id),
        fetchUserStats(user.id),
        fetchPrefs(user.id),
      ]);
      setProfile(p);
      setXp(stats.xp);
      setCurrentMonth(stats.currentMonth);
      setWeightUnitState(prefs.weight_unit);
      await reloadLifting();
      await reloadRunning();

      // Monthly rollover
      const cur = monthKey();
      if (stats.currentMonth !== cur) {
        const prevRank = getRank(stats.xp);
        await insertRankHistory(user.id, {
          monthKey: stats.currentMonth,
          monthName: new Date(stats.currentMonth + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" }),
          finalXp: stats.xp,
          highestRankName: prevRank.name,
          highestRankIcon: prevRank.icon,
        });
        await saveUserStats(user.id, 0, cur);
        setXp(0);
        setCurrentMonth(cur);
        toast.success("New month, fresh start!", {
          description: `Last month you were ${prevRank.icon} ${prevRank.name} with ${stats.xp} XP.`,
        });
      }
    })();
  }, [user?.id]);

  const setWeightUnit = (u: WeightUnit) => {
    setWeightUnitState(u);
    if (user) savePrefs(user.id, { weight_unit: u });
  };

  const saveProfile = async (p: AthleteProfile) => {
    if (!user) return;
    await saveAthleteProfile(user.id, p);
    setProfile(p);
  };

  const addXp = async (amount: number) => {
    if (!user) return null;
    const before = xp;
    const after = before + amount;
    const beforeRank = getRank(before);
    const afterRank = getRank(after);
    setXp(after);
    await saveUserStats(user.id, after, currentMonth);
    if (beforeRank.name !== afterRank.name) {
      setRankUp(afterRank);
      return { rankedUp: true, newRank: afterRank };
    }
    return { rankedUp: false, newRank: afterRank };
  };

  const addPRBonus = async (_xp: number) => {
    await addXp(XP_PR_BONUS);
  };

  const rank = getRank(xp);
  const next = getNextRank(xp);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Workouts</p>
          <h1 className="text-3xl font-bold mt-1">Train. Log. Level up.</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
          <User className="h-4 w-4 mr-1.5" />
          {profile ? `Profile (${profile.weightLbs}lb)` : "Setup profile"}
        </Button>
      </header>

      <RankCard rank={rank} xp={xp} next={next} />

      <AthleticProfileBar />

      <Tabs value={sport} onValueChange={(v) => setSport(v as Sport)}>
        <TabsList className="grid grid-cols-2 w-full mb-6">
          <TabsTrigger value="weightlifting">🏋️ Weightlifting</TabsTrigger>
          <TabsTrigger value="running">🏃 Running</TabsTrigger>
        </TabsList>
        <TabsContent value="weightlifting">
          <SportPanel
            sport="weightlifting"
            entries={lifting}
            reload={reloadLifting}
            onLog={addXp}
            onPR={addPRBonus}
            profile={profile}
            weightUnit={weightUnit}
            setWeightUnit={setWeightUnit}
          />
        </TabsContent>
        <TabsContent value="running">
          <SportPanel
            sport="running"
            entries={running}
            reload={reloadRunning}
            onLog={addXp}
            onPR={addPRBonus}
            profile={profile}
            weightUnit={weightUnit}
            setWeightUnit={setWeightUnit}
          />
        </TabsContent>
      </Tabs>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} profile={profile} onSave={saveProfile} />

      <AnimatePresence>
        {rankUp && <RankUpBanner rank={rankUp} onDone={() => setRankUp(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default Workouts;