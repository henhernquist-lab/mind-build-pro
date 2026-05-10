import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft, ChevronRight, CalendarDays, Repeat, Settings, Trash2, Pencil, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RecurringEvent, RecurrenceRule, Override, Category, dayMatches, ruleLabel,
} from "@/lib/recurring";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  usePlannerData, addBlock, updateBlock, deleteBlock,
  addRecurring, updateRecurring, deleteRecurring, upsertOverride,
  fetchLabels, addLabel, updateLabel, deleteLabel,
  minutesBetween, addMinutes, overlaps, PlannerLabel, Block,
} from "@/lib/planner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AiSuggestions } from "@/components/planner/AiSuggestions";
import { NutritionTodayCard } from "@/components/planner/NutritionTodayCard";
import { WeatherCheckCard } from "@/components/planner/WeatherCheckCard";
import { ChampionshipBanner } from "@/components/seasons/ChampionshipBanner";
import { ConsistencyScore } from "@/components/planner/ConsistencyScore";

const CAT_META: Record<Category, { label: string; emoji: string; color: string }> = {
  school: { label: "School", emoji: "🔵", color: "hsl(var(--school))" },
  sports: { label: "Sports", emoji: "🟠", color: "hsl(var(--sports))" },
  free:   { label: "Free",   emoji: "⚪", color: "hsl(var(--free))" },
};

const CATEGORIES: Category[] = ["school", "sports", "free"];

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

// 15-minute grid (6am - 10pm)
const GRID_START = 6 * 60;
const GRID_END = 22 * 60;

type ResolvedBlock = Block & {
  recurringId?: string;
  overridden?: boolean;
};

const resolveDay = (
  dateKey: string,
  blocks: Block[],
  recurring: RecurringEvent[],
  overrides: Override[],
): ResolvedBlock[] => {
  const date = parseKey(dateKey);
  const ovByRec = new Map<string, Override>();
  for (const o of overrides) {
    if (o.date === dateKey) ovByRec.set(o.recurringId, o);
  }
  const out: ResolvedBlock[] = [];
  for (const ev of recurring) {
    if (dateKey < ev.startDate) continue;
    if (ev.endDate && dateKey > ev.endDate) continue;
    if (!dayMatches(ev.rule, date)) continue;
    const ov = ovByRec.get(ev.id);
    if (ov?.type === "skip") continue;
    if (ov?.type === "replace") {
      out.push({
        date: dateKey,
        startTime: ov.startTime ?? ev.startTime,
        endTime: ov.endTime ?? ev.endTime,
        label: ov.label,
        category: ov.category,
        recurringId: ev.id,
        overridden: true,
      });
    } else {
      out.push({
        date: dateKey,
        startTime: ev.startTime,
        endTime: ev.endTime,
        label: ev.label,
        category: ev.category,
        recurringId: ev.id,
      });
    }
  }
  for (const b of blocks) out.push({ ...b });
  out.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return out;
};

const DURATION_PRESETS = [30, 60, 90, 120, 180] as const;
const durationLabel = (m: number) =>
  m >= 60 ? (m % 60 === 0 ? `${m / 60} hr` : `${(m / 60).toFixed(1)} hr`) : `${m} min`;

const TIME_OPTIONS: string[] = (() => {
  const arr: string[] = [];
  for (let mins = GRID_START; mins <= GRID_END; mins += 15) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    arr.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return arr;
})();

const DailyPlanner = () => {
  const { user, profile } = useAuth();
  const [dateKey, setDateKey] = useState<string>(todayKey());
  const { blocks, recurring, overrides, refresh } = usePlannerData(dateKey, user?.id);

  const [labels, setLabels] = useState<PlannerLabel[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    fetchLabels(user.id).then(setLabels);
  }, [user?.id]);
  const reloadLabels = async () => {
    if (!user?.id) return;
    setLabels(await fetchLabels(user.id));
  };

  // First name from preferences override or profile
  const [firstName, setFirstName] = useState<string>("");
  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("user_preferences")
        .select("first_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const override = (data as any)?.first_name as string | null | undefined;
      if (override && override.trim()) {
        setFirstName(override.trim().split(" ")[0]);
        return;
      }
      const fromProfile = profile?.display_name?.trim().split(" ")[0];
      setFirstName(fromProfile || user.email?.split("@")[0] || "friend");
    })();
  }, [user?.id, profile?.display_name, user?.email]);

  const [editing, setEditing] = useState<ResolvedBlock | null>(null);
  const [creatingAt, setCreatingAt] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const resolved = useMemo(
    () => resolveDay(dateKey, blocks, recurring, overrides),
    [dateKey, blocks, recurring, overrides],
  );

  const totals = useMemo(() => {
    const t: Record<Category, number> = { school: 0, sports: 0, free: 0 };
    for (const r of resolved) {
      const mins = minutesBetween(r.startTime, r.endTime);
      t[r.category] += mins / 60;
    }
    return t;
  }, [resolved]);

  const openCreate = (slot: string) => {
    setCreatingAt(slot);
    setEditing(null);
  };

  const date = parseKey(dateKey);
  const isToday = dateKey === todayKey();
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto stagger-container">
      <header className="mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-3xl md:text-4xl font-bold"
        >
          Hello, {firstName || "friend"}! 👋
        </motion.h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          {isToday ? `Today — ${dateLabel}` : dateLabel}
        </p>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => setDateKey((k) => shiftKey(k, -1))} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg border border-border bg-card px-4 py-2 flex-1 min-w-[180px]">
            <div className="text-sm font-semibold">{dateLabel}</div>
            <div className="text-[11px] text-muted-foreground">{date.getFullYear()}</div>
          </div>
          <Button variant="outline" size="icon" onClick={() => setDateKey((k) => shiftKey(k, 1))} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="secondary" size="sm" onClick={() => setDateKey(todayKey())}>
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Today
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
            <Settings className="h-4 w-4 mr-1.5" /> Manage Planner
          </Button>
        </div>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {CATEGORIES.map((k) => (
          <motion.div
            key={k}
            whileHover={{ y: -2 }}
            className="stagger-child rounded-xl border border-border bg-card p-4"
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

      <WeatherCheckCard
        dateKey={dateKey}
        resolvedBlocks={resolved.map((r) => ({
          id: r.id,
          recurringId: r.recurringId,
          startTime: r.startTime,
          endTime: r.endTime,
          label: r.label,
          category: r.category,
        }))}
        userId={user?.id}
        onChanged={() => refresh()}
      />

      <ChampionshipBanner />
      <ConsistencyScore />

      <AiSuggestions
        dateKey={dateKey}
        busyTimes={resolved.map((r: any) => ({ start: r.startTime, end: r.endTime, label: r.label }))}
        onAdded={() => refresh()}
      />

      <NutritionTodayCard />

      {/* Schedule list — shows resolved blocks + "+ Add" buttons for empty regions */}
      <motion.div
        key={dateKey}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        {resolved.length === 0 && (
          <button
            onClick={() => openCreate("08:00")}
            className="w-full p-6 text-sm text-muted-foreground hover:bg-accent/40"
          >
            — no blocks yet — tap to add your first
          </button>
        )}
        {resolved.map((b, i) => {
          const meta = CAT_META[b.category];
          const mins = minutesBetween(b.startTime, b.endTime);
          return (
            <button
              key={(b.id ?? b.recurringId ?? i) + b.startTime}
              onClick={() => setEditing(b)}
              className="w-full flex items-start gap-4 px-4 py-3 text-left border-b border-border last:border-b-0 hover:bg-accent/40"
            >
              <div className="w-24 flex-shrink-0 pt-0.5">
                <div className="text-xs font-medium tabular-nums">{fmt12(b.startTime)}</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">→ {fmt12(b.endTime)}</div>
              </div>
              <div
                className="flex-1 rounded-md px-3 py-2 flex items-center gap-2 min-w-0"
                style={{ backgroundColor: meta.color, color: "hsl(var(--background))" }}
              >
                {b.recurringId && <Repeat className="h-3 w-3 flex-shrink-0" />}
                <span className="font-medium truncate flex-1">
                  {b.label || meta.label}
                </span>
                <span className="text-[10px] opacity-80 tabular-nums">{durationLabel(mins)}</span>
              </div>
            </button>
          );
        })}
        <button
          onClick={() => openCreate(resolved.length > 0 ? resolved[resolved.length - 1].endTime : "08:00")}
          className="w-full p-3 text-xs text-muted-foreground hover:bg-accent/40 border-t border-border"
        >
          + Add time block
        </button>
      </motion.div>

      {/* Create dialog */}
      {creatingAt !== null && user && (
        <BlockDialog
          mode="create"
          initial={{
            date: dateKey,
            startTime: creatingAt,
            endTime: addMinutes(creatingAt, 60),
            label: "",
            category: "school",
          }}
          labels={labels}
          onClose={() => setCreatingAt(null)}
          existing={resolved}
          onSave={async (draft, rule) => {
            try {
              if (rule && rule.type !== "none") {
                await addRecurring(user.id, {
                  startTime: draft.startTime,
                  endTime: draft.endTime,
                  label: draft.label,
                  category: draft.category,
                  rule,
                  startDate: dateKey,
                });
              } else {
                await addBlock(user.id, draft);
              }
              await refresh();
              setCreatingAt(null);
              toast.success("Block added");
            } catch (e: any) {
              toast.error(e.message ?? "Could not add block");
            }
          }}
        />
      )}

      {/* Edit dialog */}
      {editing && user && (
        <BlockDialog
          mode="edit"
          initial={{
            id: editing.id,
            date: dateKey,
            startTime: editing.startTime,
            endTime: editing.endTime,
            label: editing.label,
            category: editing.category,
          }}
          recurringId={editing.recurringId}
          labels={labels}
          onClose={() => setEditing(null)}
          existing={resolved.filter((r) => r !== editing)}
          onSave={async (draft, _rule, scope) => {
            try {
              if (editing.recurringId) {
                if (scope === "all") {
                  await updateRecurring(editing.recurringId, {
                    startTime: draft.startTime,
                    endTime: draft.endTime,
                    label: draft.label,
                    category: draft.category,
                  });
                } else {
                  await upsertOverride(user.id, {
                    type: "replace",
                    recurringId: editing.recurringId,
                    date: dateKey,
                    label: draft.label,
                    category: draft.category,
                    startTime: draft.startTime,
                    endTime: draft.endTime,
                  });
                }
              } else if (editing.id) {
                await updateBlock(editing.id, draft);
              }
              await refresh();
              setEditing(null);
              toast.success("Block updated");
            } catch (e: any) {
              toast.error(e.message ?? "Could not update block");
            }
          }}
          onDelete={async (scope) => {
            try {
              if (editing.recurringId) {
                if (scope === "all") {
                  await deleteRecurring(editing.recurringId);
                } else {
                  await upsertOverride(user.id, {
                    type: "skip",
                    recurringId: editing.recurringId,
                    date: dateKey,
                  });
                }
              } else if (editing.id) {
                await deleteBlock(editing.id);
              }
              await refresh();
              setEditing(null);
              toast.success("Block removed");
            } catch (e: any) {
              toast.error(e.message ?? "Could not remove block");
            }
          }}
        />
      )}

      {/* Manage Planner */}
      {manageOpen && user && (
        <ManagePlannerDialog
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          labels={labels}
          userId={user.id}
          onChanged={reloadLabels}
          recurring={recurring}
          onRecurringChanged={refresh}
        />
      )}
    </div>
  );
};

// ---------- Block dialog ----------
const BlockDialog = ({
  mode, initial, labels, onClose, onSave, onDelete, existing, recurringId,
}: {
  mode: "create" | "edit";
  initial: Block;
  labels: PlannerLabel[];
  existing: ResolvedBlock[];
  recurringId?: string;
  onClose: () => void;
  onSave: (
    draft: Block,
    rule?: RecurrenceRule,
    scope?: "one" | "all",
  ) => void | Promise<void>;
  onDelete?: (scope?: "one" | "all") => void | Promise<void>;
}) => {
  const [draft, setDraft] = useState<Block>(initial);
  const [rule, setRule] = useState<RecurrenceRule>({ type: "none" });
  const [scope, setScope] = useState<"one" | "all">("one");
  const [labelId, setLabelId] = useState<string>("");

  const duration = minutesBetween(draft.startTime, draft.endTime);
  const applyDuration = (mins: number) => {
    setDraft((d) => ({ ...d, endTime: addMinutes(d.startTime, mins) }));
  };

  const schoolLabels = labels.filter((l) => l.category === "school");
  const catLabels = labels.filter((l) => l.category === draft.category);

  const overlapping = existing.find(
    (r) => overlaps(draft.startTime, draft.endTime, r.startTime, r.endTime),
  );
  const invalidRange = duration <= 0;

  const canSave = !invalidRange;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? "New time block" : "Edit time block"}
            {recurringId && <Repeat className="h-4 w-4 text-primary" />}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {recurringId && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="text-xs text-muted-foreground">Part of a recurring series — apply changes to:</div>
              <div className="grid grid-cols-2 gap-2">
                {(["one", "all"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className={cn(
                      "rounded-lg border p-2 text-xs font-medium",
                      scope === s ? "border-primary bg-accent" : "border-border",
                    )}
                  >
                    {s === "one" ? "Just this day" : "All days in series"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <Label className="text-xs">Category</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {CATEGORIES.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, category: k }))}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-all",
                    draft.category === k ? "ring-2" : "border-border",
                  )}
                  style={{
                    backgroundColor: draft.category === k ? CAT_META[k].color : "transparent",
                    color: draft.category === k ? "hsl(var(--background))" : CAT_META[k].color,
                    borderColor: CAT_META[k].color,
                    // @ts-expect-error ring css var
                    "--tw-ring-color": CAT_META[k].color,
                  }}
                >
                  {CAT_META[k].emoji} {CAT_META[k].label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject picker — School = subject list, others = optional activity picker */}
          {draft.category === "school" && schoolLabels.length > 0 && (
            <div>
              <Label className="text-xs">Subject</Label>
              <Select
                value={labelId}
                onValueChange={(v) => {
                  setLabelId(v);
                  const found = labels.find((l) => l.id === v);
                  if (found) setDraft((d) => ({ ...d, label: found.name }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Pick a subject…" /></SelectTrigger>
                <SelectContent>
                  {schoolLabels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {draft.category !== "school" && catLabels.length > 0 && (
            <div>
              <Label className="text-xs">Activity</Label>
              <Select
                value={labelId}
                onValueChange={(v) => {
                  setLabelId(v);
                  const found = labels.find((l) => l.id === v);
                  if (found) setDraft((d) => ({ ...d, label: found.name }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Pick or type below…" /></SelectTrigger>
                <SelectContent>
                  {catLabels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Label text */}
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="e.g. Algebra homework, football practice…"
            />
          </div>

          {/* Start time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start</Label>
              <Select
                value={draft.startTime}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    startTime: v,
                    endTime: addMinutes(v, Math.max(15, duration)),
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{fmt12(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Select
                value={draft.endTime}
                onValueChange={(v) => setDraft((d) => ({ ...d, endTime: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_OPTIONS.filter((t) => t > draft.startTime).map((t) => (
                    <SelectItem key={t} value={t}>{fmt12(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration quick picks */}
          <div>
            <Label className="text-xs">Quick duration</Label>
            <div className="grid grid-cols-6 gap-1.5 mt-1.5">
              {DURATION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => applyDuration(m)}
                  className={cn(
                    "rounded-md border text-[11px] py-1.5 font-medium",
                    duration === m ? "bg-primary text-primary-foreground border-primary" : "border-border",
                  )}
                >
                  {durationLabel(m)}
                </button>
              ))}
              <div className="rounded-md border border-border text-[11px] py-1.5 font-medium text-center text-muted-foreground">
                {durationLabel(duration)}
              </div>
            </div>
          </div>

          {/* Repeat */}
          {mode === "create" && (
            <RepeatPicker rule={rule} setRule={setRule} />
          )}

          {invalidRange && (
            <div className="text-xs text-destructive">End time must be after start time.</div>
          )}
          {!invalidRange && overlapping && (
            <div className="text-xs text-destructive">
              Overlaps with "{overlapping.label || CAT_META[overlapping.category].label}" ({fmt12(overlapping.startTime)}–{fmt12(overlapping.endTime)})
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {mode === "edit" && onDelete && (
            <Button variant="ghost" onClick={() => onDelete(recurringId ? scope : undefined)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
          <Button
            onClick={() => onSave(draft, mode === "create" ? rule : undefined, recurringId ? scope : undefined)}
            disabled={!canSave}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Repeat picker ----------
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const RepeatPicker = ({ rule, setRule }: { rule: RecurrenceRule; setRule: (r: RecurrenceRule) => void }) => {
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
          else if (v === "custom") setRule({ type: "custom", days });
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
                  "h-9 w-9 rounded-md text-xs font-semibold border",
                  sel ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
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

// ---------- Manage Planner ----------
const ManagePlannerDialog = ({
  open, onClose, labels, userId, onChanged, recurring, onRecurringChanged,
}: {
  open: boolean;
  onClose: () => void;
  labels: PlannerLabel[];
  userId: string;
  onChanged: () => void;
  recurring: RecurringEvent[];
  onRecurringChanged: () => void;
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("school");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCat, setEditCat] = useState<Category>("school");

  const add = async () => {
    if (!name.trim()) return;
    await addLabel(userId, name.trim(), category, labels.length);
    setName("");
    onChanged();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateLabel(editingId, { name: editName.trim(), category: editCat });
    setEditingId(null);
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Planner</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Add a subject / activity
            </div>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Algebra 1, Football practice…"
              />
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{CAT_META[c].emoji} {CAT_META[c].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={add} disabled={!name.trim()}>Add</Button>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Your labels
            </div>
            {labels.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                No labels yet. Add one above to start.
              </div>
            ) : (
              <div className="space-y-1.5">
                {labels.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                    {editingId === l.id ? (
                      <>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                        <Select value={editCat} onValueChange={(v) => setEditCat(v as Category)}>
                          <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>{CAT_META[c].emoji} {CAT_META[c].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button onClick={saveEdit} className="p-1 text-primary"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
                      </>
                    ) : (
                      <>
                        <div
                          className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 text-[10px]"
                          style={{ background: CAT_META[l.category].color, color: "hsl(var(--background))" }}
                        >
                          {CAT_META[l.category].emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{l.name}</div>
                          <div className="text-[10px] text-muted-foreground">{CAT_META[l.category].label}</div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingId(l.id);
                            setEditName(l.name);
                            setEditCat(l.category);
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => { await deleteLabel(l.id); onChanged(); }}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Recurring events ({recurring.length})
            </div>
            {recurring.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                No recurring events.
              </div>
            ) : (
              <div className="space-y-1.5">
                {recurring.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                    <div
                      className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 text-[10px]"
                      style={{ background: CAT_META[ev.category].color, color: "hsl(var(--background))" }}
                    >
                      {CAT_META[ev.category].emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{ev.label || CAT_META[ev.category].label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {fmt12(ev.startTime)}–{fmt12(ev.endTime)} · {ruleLabel(ev.rule)}
                      </div>
                    </div>
                    <button
                      onClick={async () => { await deleteRecurring(ev.id); onRecurringChanged(); }}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyPlanner;