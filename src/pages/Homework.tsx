import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Priority = "high" | "medium" | "low";
type Task = {
  id: string;
  subject: string;
  name: string;
  due: string; // YYYY-MM-DD
  priority: Priority;
  done: boolean;
  doneAt?: string;
};

const SUBJECTS = [
  "Algebra 1",
  "Lang & Lit",
  "Georgia Studies",
  "Physical Science",
  "Spanish",
  "PE / Health",
  "Other",
];

const PRIO_META: Record<Priority, { label: string; color: string; emoji: string }> = {
  high: { label: "High", color: "hsl(var(--destructive))", emoji: "🔴" },
  medium: { label: "Medium", color: "hsl(var(--sports))", emoji: "🟡" },
  low: { label: "Low", color: "hsl(var(--coding))", emoji: "🟢" },
};

const today = () => new Date().toISOString().slice(0, 10);

const Homework = () => {
  const [tasks, setTasks] = useLocalStorage<Task[]>("homework:tasks", []);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [due, setDue] = useState(today());
  const [priority, setPriority] = useState<Priority>("medium");

  const sorted = useMemo(() => {
    const live = tasks.filter((t) => !t.done).sort((a, b) => a.due.localeCompare(b.due));
    const done = tasks
      .filter((t) => t.done)
      .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
    return [...live, ...done];
  }, [tasks]);

  const todayTotal = tasks.filter((t) => t.due === today()).length;
  const todayDone = tasks.filter((t) => t.due === today() && t.done).length;
  const pct = todayTotal === 0 ? 0 : Math.round((todayDone / todayTotal) * 100);

  const add = () => {
    if (!name.trim()) return;
    setTasks((arr) => [
      ...arr,
      { id: crypto.randomUUID(), subject, name: name.trim(), due, priority, done: false },
    ]);
    setName("");
  };

  const toggle = (id: string) =>
    setTasks((arr) =>
      arr.map((t) =>
        t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : undefined } : t
      )
    );
  const remove = (id: string) => setTasks((arr) => arr.filter((t) => t.id !== id));

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Assignments</p>
        <h1 className="text-3xl font-bold mt-1">Homework</h1>
      </header>

      {/* Today progress */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex justify-between items-baseline mb-2">
          <div>
            <div className="text-sm font-medium">Today's progress</div>
            <div className="text-xs text-muted-foreground">
              {todayDone} of {todayTotal} due today complete
            </div>
          </div>
          <div className="text-2xl font-bold text-school">{pct}%</div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-school"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6 grid gap-3 md:grid-cols-[1fr_140px_140px_120px_auto]">
        <div>
          <Label className="text-[11px] text-muted-foreground">Assignment</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chapter 4 problems #1-15"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Subject</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Due</Label>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PRIO_META) as Priority[]).map((p) => (
                <SelectItem key={p} value={p}>{PRIO_META[p].emoji} {PRIO_META[p].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={add} className="w-full md:w-auto"><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {sorted.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              No assignments yet. Add one above to get started.
            </div>
          )}
          {sorted.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className={cn(
                "rounded-lg border border-border bg-card p-3 flex items-center gap-3 group",
                t.done && "opacity-60"
              )}
            >
              <Checkbox checked={t.done} onCheckedChange={() => toggle(t.id)} />
              <div className="h-8 w-1 rounded-full" style={{ backgroundColor: PRIO_META[t.priority].color }} />
              <div className="flex-1 min-w-0">
                <div className={cn("text-sm font-medium truncate", t.done && "line-through")}>
                  {t.name}
                </div>
                <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                  <span>{t.subject}</span>
                  <span>·</span>
                  <span>Due {new Date(t.due + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </div>
              </div>
              <button
                onClick={() => remove(t.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Homework;