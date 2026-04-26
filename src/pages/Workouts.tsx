import { useMemo, useState } from "react";
import { useLocalStorage } from "@/lib/storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, Trash2, Sparkles, User } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRankSystem, type Rank } from "@/lib/rank";
import {
  AthleteProfile, Gender, Grade, gradeColor, gradeWorkout, averageGrade,
} from "@/lib/athlete";

type Sport = "football" | "track";
type Unit = "lbs" | "reps" | "seconds" | "minutes" | "yards";
type Entry = {
  id: string;
  sport: Sport;
  exercise: string;
  value: number;
  unit: Unit;
  date: string;
  isPR?: boolean;
  addedWeight?: number;
  grade?: Grade;
  xp?: number;
  note?: string;
  breakdown?: string;
};

const isLowerBetter = (u: Unit) => u === "seconds" || u === "minutes";

// ---------- Grade Badge ----------
const GradeBadge = ({ grade }: { grade: Grade }) => (
  <span
    className="inline-flex items-center justify-center h-6 min-w-[28px] px-1.5 rounded-md text-[11px] font-bold tabular-nums"
    style={{ background: gradeColor(grade), color: "hsl(var(--background))" }}
  >
    {grade}
  </span>
);

// ---------- Profile Setup Dialog ----------
const ProfileDialog = ({
  open, onOpenChange, profile, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: AthleteProfile | null;
  onSave: (p: AthleteProfile) => void;
}) => {
  const [age, setAge] = useState(profile?.age?.toString() ?? "");
  const [ft, setFt] = useState(profile?.heightFt?.toString() ?? "");
  const [inch, setInch] = useState(profile?.heightIn?.toString() ?? "");
  const [w, setW] = useState(profile?.weightLbs?.toString() ?? "");
  const [g, setG] = useState<Gender>(profile?.gender ?? "male");

  const save = () => {
    const p: AthleteProfile = {
      age: parseInt(age) || 13,
      heightFt: parseInt(ft) || 5,
      heightIn: parseInt(inch) || 0,
      weightLbs: parseInt(w) || 120,
      gender: g,
    };
    onSave(p);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Athlete Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Age</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="13" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Height (ft)</Label>
              <Input type="number" value={ft} onChange={(e) => setFt(e.target.value)} placeholder="5" />
            </div>
            <div>
              <Label className="text-xs">Height (in)</Label>
              <Input type="number" value={inch} onChange={(e) => setInch(e.target.value)} placeholder="6" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Weight (lbs)</Label>
            <Input type="number" value={w} onChange={(e) => setW(e.target.value)} placeholder="120" />
          </div>
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
        <DialogFooter>
          <Button onClick={save}>Save profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Rank Card ----------
const RankCard = ({
  rank,
  xp,
  next,
}: {
  rank: Rank;
  xp: number;
  next: Rank | null;
}) => {
  const progress = next
    ? Math.min(100, Math.max(0, ((xp - rank.xpRequired) / (next.xpRequired - rank.xpRequired)) * 100))
    : 100;
  const xpToNext = next ? next.xpRequired - xp : 0;

  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 mb-6 relative overflow-hidden"
      style={{ borderTop: `3px solid ${rank.color}` }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{ background: `radial-gradient(circle at top right, ${rank.color}, transparent 60%)` }}
      />
      <div className="relative flex items-center gap-4 flex-wrap">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
          style={{ background: `${rank.color}22`, border: `1px solid ${rank.color}44` }}
        >
          {rank.icon}
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Current rank</div>
          <div className="text-2xl font-bold" style={{ color: rank.color }}>{rank.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {xp} XP {next ? `· ${xpToNext} XP to ${next.icon} ${next.name}` : "· max rank reached 🔥"}
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden relative">
        <motion.div
          className="h-full rounded-full"
          style={{ background: rank.color }}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{rank.xpRequired} XP</span>
        {next && <span>{next.xpRequired} XP</span>}
      </div>
    </div>
  );
};

// ---------- Last Month Card ----------
const LastMonthCard = ({
  entry,
}: {
  entry: { monthName: string; finalXp: number; highestRankName: string; highestRankIcon: string };
}) => (
  <div className="rounded-xl border border-border bg-card/60 p-4 mb-6">
    <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Last month</div>
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="text-sm font-semibold">{entry.monthName}</div>
        <div className="text-xs text-muted-foreground">Season recap</div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold flex items-center gap-1.5">
          <span>{entry.highestRankIcon}</span>
          <span>{entry.highestRankName}</span>
        </div>
        <div className="text-xs text-muted-foreground">{entry.finalXp} XP</div>
      </div>
    </div>
  </div>
);

// ---------- Rank Up Banner ----------
const RankUpBanner = ({ rank, onDone }: { rank: Rank; onDone: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
    onClick={onDone}
  >
    <motion.div
      initial={{ scale: 0.7, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="rounded-3xl border border-border bg-card px-10 py-12 text-center max-w-sm mx-4 relative overflow-hidden"
      style={{ borderColor: rank.color, boxShadow: `0 0 60px ${rank.color}55` }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{ background: `radial-gradient(circle at center, ${rank.color}, transparent 70%)` }}
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
        className="text-7xl mb-4 relative"
      >
        {rank.icon}
      </motion.div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground relative">Rank up!</div>
      <div className="text-3xl font-bold mt-1 relative" style={{ color: rank.color }}>
        {rank.name}
      </div>
      <div className="text-sm text-muted-foreground mt-3 relative">
        Keep grinding — the next level awaits.
      </div>
      <Button onClick={onDone} className="mt-6 relative" style={{ background: rank.color, color: "hsl(var(--background))" }}>
        <Sparkles className="h-4 w-4 mr-1.5" /> Let's go
      </Button>
    </motion.div>
  </motion.div>
);

// ---------- Sport Panel ----------
const SportPanel = ({
  sport,
  onLog,
  onPR,
  profile,
}: {
  sport: Sport;
  onLog: (xp: number) => void;
  onPR: (xp: number) => void;
  profile: AthleteProfile | null;
}) => {
  const [entries, setEntries] = useLocalStorage<Entry[]>(`workouts:${sport}`, []);
  const [exercise, setExercise] = useState("");
  const [value, setValue] = useState("");
  const [addedWeight, setAddedWeight] = useState("");
  const [unit, setUnit] = useState<Unit>(sport === "football" ? "lbs" : "seconds");

  const exercises = useMemo(
    () => Array.from(new Set(entries.map((e) => e.exercise))).sort(),
    [entries]
  );

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

  const add = () => {
    const v = parseFloat(value);
    if (!exercise.trim() || isNaN(v)) return;
    const aw = parseFloat(addedWeight) || 0;
    const prior = entries.filter((e) => e.exercise.toLowerCase() === exercise.trim().toLowerCase());
    let isPR = true;
    if (prior.length > 0) {
      const best = prior.reduce((acc, x) =>
        (isLowerBetter(unit) ? x.value < acc.value : x.value > acc.value) ? x : acc
      );
      isPR = isLowerBetter(unit) ? v < best.value : v > best.value;
    }
    const result = profile ? gradeWorkout(exercise.trim(), v, unit, aw, profile) : null;
    setEntries((arr) => [
      ...arr,
      {
        id: crypto.randomUUID(),
        sport,
        exercise: exercise.trim(),
        value: v,
        unit,
        date: new Date().toISOString(),
        isPR,
        addedWeight: aw || undefined,
        grade: result?.grade,
        xp: result?.xp,
        note: result?.note,
        breakdown: result?.breakdown,
      },
    ]);
    setValue("");
    setAddedWeight("");
    onLog(result?.xp ?? 10);
    if (isPR) onPR(result?.xp ?? 10);
  };

  const remove = (id: string) => setEntries((arr) => arr.filter((e) => e.id !== id));
  const accent = sport === "football" ? "hsl(var(--sports))" : "hsl(var(--coding))";
  const isRepsBased = unit === "reps";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 grid gap-3 md:grid-cols-[1fr_100px_120px_120px_auto]">
        <div>
          <Label className="text-[11px] text-muted-foreground">Exercise</Label>
          <Input
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            placeholder={sport === "football" ? "Bench press" : "100m sprint"}
            list={`ex-${sport}`}
          />
          <datalist id={`ex-${sport}`}>
            {exercises.map((e) => <option key={e} value={e} />)}
          </datalist>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Value</Label>
          <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Unit</Label>
          <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lbs">lbs</SelectItem>
              <SelectItem value="reps">reps</SelectItem>
              <SelectItem value="seconds">seconds</SelectItem>
              <SelectItem value="minutes">minutes</SelectItem>
              <SelectItem value="yards">yards</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">+Weight (lbs)</Label>
          <Input
            type="number"
            step="1"
            value={addedWeight}
            onChange={(e) => setAddedWeight(e.target.value)}
            placeholder="0"
            disabled={!isRepsBased}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={add} style={{ backgroundColor: accent, color: "hsl(var(--background))" }}>
            <Plus className="h-4 w-4 mr-1" />Log
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4" style={{ color: accent }} /> All-time PRs
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
                <div className="text-2xl font-bold mt-1" style={{ color: accent }}>
                  {pr.value} <span className="text-sm font-normal text-muted-foreground">{pr.unit}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(pr.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {exercises.map((ex) => {
        const data = entries
          .filter((e) => e.exercise === ex)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((e) => ({
            date: new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={accent}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: accent }}
                    activeDot={{ r: 6 }}
                  />
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
                      className={cn(
                        "flex flex-col gap-1 text-xs px-3 py-2 rounded-md group",
                        e.isPR && "bg-accent"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {e.grade && <GradeBadge grade={e.grade} />}
                          {e.isPR && <Trophy className="h-3 w-3 flex-shrink-0" style={{ color: accent }} />}
                          <span className="font-medium">
                            {e.value} {e.unit}
                            {e.addedWeight ? ` +${e.addedWeight}lb` : ""}
                          </span>
                          {e.isPR && (
                            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: accent }}>
                              PR
                            </span>
                          )}
                          {e.xp !== undefined && (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              +{e.xp}{e.isPR ? "+50" : ""} XP
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-muted-foreground">
                            {new Date(e.date).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => remove(e.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {(e.note || e.breakdown) && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap pl-1">
                          {e.note && <span>{e.note}</span>}
                          {e.breakdown && (
                            <span className="text-muted-foreground/70">· {e.breakdown}</span>
                          )}
                        </div>
                      )}
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

const Workouts = () => {
  const { xp, rank, nextRank, history, addXp } = useRankSystem();
  const [rankUp, setRankUp] = useState<Rank | null>(null);
  const [profile, setProfile] = useLocalStorage<AthleteProfile | null>("athlete:profile", null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [football] = useLocalStorage<Entry[]>("workouts:football", []);
  const [track] = useLocalStorage<Entry[]>("workouts:track", []);

  const overallGrade = useMemo(() => {
    const recent = [...football, ...track]
      .filter((e) => e.grade)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20)
      .map((e) => e.grade!) as Grade[];
    return averageGrade(recent);
  }, [football, track]);

  // SportPanel calls onLog() once per workout, plus onPR() if it was a PR.
  const onLog = (xpEarned: number) => {
    const result = addXp(xpEarned);
    toast("💪 Workout logged", { description: `+${xpEarned} XP earned`, duration: 2200 });
    if (result.rankedUp) setTimeout(() => setRankUp(result.newRank), 600);
  };
  const onPR = () => {
    const result = addXp(50, { isPR: true });
    toast.success("🏆 New PR! +50 XP bonus", { duration: 4000 });
    if (result.rankedUp) setTimeout(() => setRankUp(result.newRank), 600);
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Performance</p>
          <h1 className="text-3xl font-bold mt-1">Workouts &amp; PRs</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
          <User className="h-4 w-4 mr-1.5" />
          {profile ? "Edit profile" : "Set up profile"}
        </Button>
      </header>

      {!profile && (
        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 mb-6 flex items-center gap-3 flex-wrap">
          <User className="h-5 w-5 text-primary" />
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm font-semibold">Set up your athlete profile</div>
            <div className="text-xs text-muted-foreground">Get age- and bodyweight-adjusted grades on every log.</div>
          </div>
          <Button size="sm" onClick={() => setProfileOpen(true)}>Set up</Button>
        </div>
      )}

      {profile && overallGrade && (
        <div className="rounded-xl border border-border bg-card p-4 mb-6 flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl font-black"
            style={{ background: gradeColor(overallGrade), color: "hsl(var(--background))" }}
          >
            {overallGrade}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Overall athletic grade</div>
            <div className="text-lg font-bold">Across last 20 logs</div>
            <div className="text-xs text-muted-foreground">
              Age {profile.age} · {profile.weightLbs}lb · {profile.gender}
            </div>
          </div>
        </div>
      )}

      <RankCard rank={rank} xp={xp} next={nextRank} />
      {history.length > 0 && <LastMonthCard entry={history[0]} />}

      <Tabs defaultValue="football">
        <TabsList className="mb-6">
          <TabsTrigger value="football" className="data-[state=active]:bg-sports data-[state=active]:text-background">
            🏈 Football
          </TabsTrigger>
          <TabsTrigger value="track" className="data-[state=active]:bg-coding data-[state=active]:text-background">
            🏃 Track
          </TabsTrigger>
        </TabsList>
        <TabsContent value="football"><SportPanel sport="football" onLog={onLog} onPR={onPR} profile={profile} /></TabsContent>
        <TabsContent value="track"><SportPanel sport="track" onLog={onLog} onPR={onPR} profile={profile} /></TabsContent>
      </Tabs>

      <AnimatePresence>
        {rankUp && <RankUpBanner rank={rankUp} onDone={() => setRankUp(null)} />}
      </AnimatePresence>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        onSave={setProfile}
      />
    </div>
  );
};

export default Workouts;
