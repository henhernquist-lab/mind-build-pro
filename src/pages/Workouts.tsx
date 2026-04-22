import { useMemo, useState } from "react";
import { useLocalStorage } from "@/lib/storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

type Sport = "football" | "track";
type Unit = "lbs" | "reps" | "seconds" | "minutes" | "yards";
type Entry = {
  id: string;
  sport: Sport;
  exercise: string;
  value: number;
  unit: Unit;
  date: string; // ISO
  isPR?: boolean;
};

// For seconds/minutes lower is better; everything else higher is better.
const isLowerBetter = (u: Unit) => u === "seconds" || u === "minutes";

const SportPanel = ({ sport }: { sport: Sport }) => {
  const [entries, setEntries] = useLocalStorage<Entry[]>(`workouts:${sport}`, []);
  const [exercise, setExercise] = useState("");
  const [value, setValue] = useState("");
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
    const prior = entries.filter((e) => e.exercise.toLowerCase() === exercise.trim().toLowerCase());
    let isPR = true;
    if (prior.length > 0) {
      const best = prior.reduce((acc, x) =>
        (isLowerBetter(unit) ? x.value < acc.value : x.value > acc.value) ? x : acc
      );
      isPR = isLowerBetter(unit) ? v < best.value : v > best.value;
    }
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
      },
    ]);
    setValue("");
  };

  const remove = (id: string) => setEntries((arr) => arr.filter((e) => e.id !== id));

  const accent = sport === "football" ? "hsl(var(--sports))" : "hsl(var(--coding))";

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="rounded-xl border border-border bg-card p-4 grid gap-3 md:grid-cols-[1fr_120px_140px_auto]">
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
        <div className="flex items-end">
          <Button onClick={add} style={{ backgroundColor: accent, color: "hsl(var(--background))" }}>
            <Plus className="h-4 w-4 mr-1" />Log
          </Button>
        </div>
      </div>

      {/* PR Board */}
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

      {/* Charts per exercise */}
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

            {/* Recent entries */}
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
                        "flex items-center justify-between text-xs px-3 py-1.5 rounded-md group",
                        e.isPR && "bg-accent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {e.isPR && <Trophy className="h-3 w-3" style={{ color: accent }} />}
                        <span className="font-medium">{e.value} {e.unit}</span>
                        {e.isPR && (
                          <span
                            className="text-[10px] uppercase font-bold tracking-wider"
                            style={{ color: accent }}
                          >
                            PR
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
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
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Performance</p>
        <h1 className="text-3xl font-bold mt-1">Workouts &amp; PRs</h1>
      </header>

      <Tabs defaultValue="football">
        <TabsList className="mb-6">
          <TabsTrigger value="football" className="data-[state=active]:bg-sports data-[state=active]:text-background">
            🏈 Football
          </TabsTrigger>
          <TabsTrigger value="track" className="data-[state=active]:bg-coding data-[state=active]:text-background">
            🏃 Track
          </TabsTrigger>
        </TabsList>
        <TabsContent value="football"><SportPanel sport="football" /></TabsContent>
        <TabsContent value="track"><SportPanel sport="track" /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Workouts;