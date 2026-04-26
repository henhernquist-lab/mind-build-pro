import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocalStorage } from "@/lib/storage";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft, ChevronRight, CalendarDays, Repeat, Settings, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RecurringEvent, RecurrenceRule, Override, getRecurringForDate, ruleLabel,
} from "@/lib/recurring";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = "school" | "sports" | "coding" | "free";
type Block = { label: string; category: Category };
type DayMap = Record<string, Block>;

type ResolvedBlock = Block & {
  recurringId?: string; // present if this block came from a recurring event
  overridden?: boolean;
};

const TIMES: string[] = (() => {
  const arr: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m === 30) break;
      arr.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return arr;
})();

const CAT_META: Record<Category, { label: string; emoji: string; color: string }> = {
  school: { label: "School", emoji: "📘", color: "hsl(var(--school))" },
  sports: { label: "Sports", emoji: "🏈", color: "hsl(var(--sports))" },
  coding: { label: "Coding", emoji: "💻", color: "hsl(var(--coding))" },
  free: { label: "Free", emoji: "⚪", color: "hsl(var(--free))" },
};

const fmt12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
};

const toDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayKey = () => toDateKey(new Date());
const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const shiftKey = (k: string, days: number) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};

const DailyPlanner = () => {
  const [dateKey, setDateKey] = useState<string>(todayKey());
  const [day, setDay] = useLocalStorage<DayMap>(`planner_${dateKey}`, {});
  const [recurring, setRecurring] = useLocalStorage<RecurringEvent[]>("planner_recurring", []);
  const [overrides, setOverrides] = useLocalStorage<Record<string, Override>>("planner_overrides", {});
  const [openTime, setOpenTime] = useState<string | null>(null);
  const [draft, setDraft] = useState<Block>({ label: "", category: "school" });
  const [draftRule, setDraftRule] = useState<RecurrenceRule>({ type: "none" });
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [scopeChoice, setScopeChoice] = useState<"one" | "all" | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  // Build effective day = manual blocks layered over recurring (manual wins),
  // honoring per-day overrides.
  const effectiveDay: Record<string, ResolvedBlock> = useMemo(() => {
    const out: Record<string, ResolvedBlock> = {};
    const recForToday = getRecurringForDate(recurring, dateKey);
    for (const ev of recForToday) {
      const ovKey = `${dateKey}_${ev.time}`;
      const ov = overrides[ovKey];
      if (ov?.type === "skip" && ov.recurringId === ev.id) continue;
      if (ov?.type === "replace" && ov.recurringId === ev.id) {
        out[ev.time] = { label: ov.label, category: ov.category, recurringId: ev.id, overridden: true };
      } else {
        out[ev.time] = { label: ev.label, category: ev.category, recurringId: ev.id };
      }
    }
    // Manual entries always win
    for (const time of Object.keys(day)) {
      out[time] = { ...day[time] };
    }
    return out;
  }, [day, recurring, overrides, dateKey]);

  const totals = useMemo(() => {
    const t: Record<Category, number> = { school: 0, sports: 0, coding: 0, free: 0 };
    for (const time of TIMES) {
      const b = effectiveDay[time];
      if (b) t[b.category] += 0.5;
      else t.free += 0.5;
    }
    return t;
  }, [effectiveDay]);

  const openBlock = (time: string) => {
    setOpenTime(time);
    const existing = effectiveDay[time];
    setDraft(existing ? { label: existing.label, category: existing.category } : { label: "", category: "school" });
    setDraftRule({ type: "none" });
    setEditingRecurringId(existing?.recurringId ?? null);
    setScopeChoice(existing?.recurringId ? null : "one");
  };

  const saveAsRecurring = () => {
    if (!openTime) return;
    const id = crypto.randomUUID();
    const ev: RecurringEvent = {
      id,
      time: openTime,
      label: draft.label,
      category: draft.category,
      rule: draftRule,
      startDate: dateKey,
    };
    setRecurring((arr) => [...arr, ev]);
    setOpenTime(null);
  };

  const save = () => {
    if (!openTime) return;

    // Recurring scenario
    if (editingRecurringId) {
      if (scopeChoice === "all") {
        // Update the series itself
        setRecurring((arr) =>
          arr.map((ev) =>
            ev.id === editingRecurringId
              ? { ...ev, label: draft.label, category: draft.category }
              : ev
          )
        );
        // Clear any one-off override for this slot
        const ovKey = `${dateKey}_${openTime}`;
        setOverrides((o) => {
          const next = { ...o };
          delete next[ovKey];
          return next;
        });
      } else {
        // Just override this one day
        const ovKey = `${dateKey}_${openTime}`;
        setOverrides((o) => ({
          ...o,
          [ovKey]: {
            type: "replace",
            recurringId: editingRecurringId,
            label: draft.label,
            category: draft.category,
          },
        }));
      }
      setOpenTime(null);
      return;
    }

    // New entry — repeat?
    if (draftRule.type !== "none") {
      saveAsRecurring();
      return;
    }

    setDay((d) => ({ ...d, [openTime]: draft }));
    setOpenTime(null);
  };

  const clear = () => {
    if (!openTime) return;
    if (editingRecurringId) {
      if (scopeChoice === "all") {
        // Delete the entire series
        setRecurring((arr) => arr.filter((ev) => ev.id !== editingRecurringId));
      } else {
        // Skip just this day
        const ovKey = `${dateKey}_${openTime}`;
        setOverrides((o) => ({
          ...o,
          [ovKey]: { type: "skip", recurringId: editingRecurringId },
        }));
      }
      setOpenTime(null);
      return;
    }
    setDay((d) => {
      const next = { ...d };
      delete next[openTime];
      return next;
    });
    setOpenTime(null);
  };

  const date = parseKey(dateKey);
  const isToday = dateKey === todayKey();
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const yearLabel = date.getFullYear();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {isToday ? "Today" : dateKey === shiftKey(todayKey(), 1) ? "Tomorrow" : dateKey === shiftKey(todayKey(), -1) ? "Yesterday" : "Planner"}
        </p>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold mt-1">Daily Planner</h1>
          <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
            <Repeat className="h-4 w-4 mr-1.5" /> Recurring
          </Button>
        </div>

        {/* Date navigation */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDateKey((k) => shiftKey(k, -1))}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg border border-border bg-card px-4 py-2 flex-1 min-w-[200px]">
            <div className="text-base font-semibold">{dateLabel}</div>
            <div className="text-[11px] text-muted-foreground">{yearLabel}</div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDateKey((k) => shiftKey(k, 1))}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="secondary" size="sm" onClick={() => setDateKey(todayKey())}>
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Jump to today
            </Button>
          )}
        </div>
      </header>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {(Object.keys(CAT_META) as Category[]).map((k) => (
          <motion.div
            key={k}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-border bg-card p-4"
            style={{ borderTop: `2px solid ${CAT_META[k].color}` }}
          >
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>{CAT_META[k].emoji}</span>
              <span>{CAT_META[k].label}</span>
            </div>
            <div className="text-2xl font-semibold mt-1" style={{ color: CAT_META[k].color }}>
              {totals[k].toFixed(1)}h
            </div>
          </motion.div>
        ))}
      </div>

      {/* Time blocks */}
      <motion.div
        key={dateKey}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        {TIMES.map((time) => {
          const b = effectiveDay[time];
          const cat = b?.category ?? "free";
          const meta = CAT_META[cat];
          return (
            <button
              key={time}
              onClick={() => openBlock(time)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-2.5 text-left border-b border-border last:border-b-0 transition-colors hover:bg-accent/40"
              )}
            >
              <div className="w-20 text-xs text-muted-foreground tabular-nums">{fmt12(time)}</div>
              <div
                className="h-7 flex-1 rounded-md flex items-center px-3 text-sm transition-all"
                style={{
                  backgroundColor: b ? `${meta.color}` : "hsl(var(--muted))",
                  opacity: b ? 0.95 : 0.4,
                  color: b ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                }}
              >
                <span className="font-medium truncate flex items-center gap-1.5">
                  {b?.recurringId && <Repeat className="h-3 w-3 flex-shrink-0" />}
                  {b ? `${meta.emoji} ${b.label || meta.label}` : "— empty —"}
                </span>
              </div>
            </button>
          );
        })}
      </motion.div>

      <Dialog open={openTime !== null} onOpenChange={(o) => !o && setOpenTime(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {openTime ? fmt12(openTime) : ""}
              {editingRecurringId && <Repeat className="h-4 w-4 text-primary" />}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingRecurringId && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="text-xs text-muted-foreground">This is part of a recurring series. Apply changes to:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScopeChoice("one")}
                    className={cn(
                      "rounded-lg border p-2 text-xs font-medium transition-all",
                      scopeChoice === "one" ? "border-primary bg-accent" : "border-border"
                    )}
                  >
                    Just this day
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeChoice("all")}
                    className={cn(
                      "rounded-lg border p-2 text-xs font-medium transition-all",
                      scopeChoice === "all" ? "border-primary bg-accent" : "border-border"
                    )}
                  >
                    All days in series
                  </button>
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">Label</Label>
              <Input
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. Math homework, Football practice…"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {(Object.keys(CAT_META) as Category[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, category: k }))}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium transition-all",
                      draft.category === k ? "ring-2" : "border-border"
                    )}
                    style={{
                      backgroundColor: draft.category === k ? CAT_META[k].color : "transparent",
                      color: draft.category === k ? "hsl(var(--background))" : CAT_META[k].color,
                      borderColor: CAT_META[k].color,
                      // @ts-expect-error css var
                      "--tw-ring-color": CAT_META[k].color,
                    }}
                  >
                    {CAT_META[k].emoji} {CAT_META[k].label}
                  </button>
                ))}
              </div>
            </div>

            {!editingRecurringId && (
              <RepeatPicker rule={draftRule} setRule={setDraftRule} />
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {openTime && (effectiveDay[openTime]) && (
              <Button variant="ghost" onClick={clear}>Clear</Button>
            )}
            <Button
              onClick={save}
              disabled={editingRecurringId ? scopeChoice === null : false}
            >
              Save block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage recurring */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Recurring Events</DialogTitle>
          </DialogHeader>
          {recurring.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No recurring events yet.
              <div className="text-xs mt-1">Set "Repeat" when adding a block to create one.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {recurring.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-border bg-card p-3 flex items-start gap-3">
                  <div
                    className="h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: CAT_META[ev.category].color }}
                  >
                    <span>{CAT_META[ev.category].emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{ev.label || CAT_META[ev.category].label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {fmt12(ev.time)} · {ruleLabel(ev.rule)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Since {ev.startDate}
                    </div>
                  </div>
                  <button
                    onClick={() => setRecurring((arr) => arr.filter((e) => e.id !== ev.id))}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Delete series"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------- Repeat Picker ----------
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const RepeatPicker = ({
  rule, setRule,
}: {
  rule: RecurrenceRule;
  setRule: (r: RecurrenceRule) => void;
}) => {
  const type = rule.type;
  const days = rule.type === "weekly" || rule.type === "custom" ? rule.days : [];

  const toggleDay = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    setRule({ type: "custom", days: next });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs flex items-center gap-1.5">
        <Repeat className="h-3.5 w-3.5" /> Repeat
      </Label>
      <Select
        value={type}
        onValueChange={(v) => {
          if (v === "none") setRule({ type: "none" });
          else if (v === "daily") setRule({ type: "daily" });
          else if (v === "weekdays") setRule({ type: "weekdays" });
          else if (v === "custom") setRule({ type: "custom", days: days });
        }}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Does not repeat</SelectItem>
          <SelectItem value="daily">Every day</SelectItem>
          <SelectItem value="weekdays">Weekdays (Mon–Fri)</SelectItem>
          <SelectItem value="custom">Custom (pick days)</SelectItem>
        </SelectContent>
      </Select>
      {type === "custom" && (
        <div className="flex gap-1.5 mt-2">
          {DAY_LABELS.map((lbl, i) => {
            const sel = days.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={cn(
                  "h-9 w-9 rounded-md text-xs font-semibold border transition-all",
                  sel ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                )}
              >
                {lbl}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DailyPlanner;
