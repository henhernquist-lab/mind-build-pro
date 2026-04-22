import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocalStorage, todayKey } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Category = "school" | "sports" | "coding" | "free";
type Block = { label: string; category: Category };
type DayMap = Record<string, Block>; // key = "HH:MM"

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

const DailyPlanner = () => {
  const [day, setDay] = useLocalStorage<DayMap>(`planner:${todayKey()}`, {});
  const [openTime, setOpenTime] = useState<string | null>(null);
  const [draft, setDraft] = useState<Block>({ label: "", category: "school" });

  const totals = useMemo(() => {
    const t: Record<Category, number> = { school: 0, sports: 0, coding: 0, free: 0 };
    for (const time of TIMES) {
      const b = day[time];
      if (b) t[b.category] += 0.5;
      else t.free += 0.5;
    }
    return t;
  }, [day]);

  const openBlock = (time: string) => {
    setOpenTime(time);
    setDraft(day[time] ?? { label: "", category: "school" });
  };

  const save = () => {
    if (!openTime) return;
    setDay((d) => ({ ...d, [openTime]: draft }));
    setOpenTime(null);
  };
  const clear = () => {
    if (!openTime) return;
    setDay((d) => {
      const next = { ...d };
      delete next[openTime];
      return next;
    });
    setOpenTime(null);
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Today</p>
        <h1 className="text-3xl font-bold mt-1">Daily Planner</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
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
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {TIMES.map((time, i) => {
          const b = day[time];
          const cat = b?.category ?? "free";
          const meta = CAT_META[cat];
          return (
            <button
              key={time}
              onClick={() => openBlock(time)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-2.5 text-left border-b border-border last:border-b-0 transition-colors hover:bg-accent/40",
                i === 0 && ""
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
                <span className="font-medium truncate">
                  {b ? `${meta.emoji} ${b.label || meta.label}` : "— empty —"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={openTime !== null} onOpenChange={(o) => !o && setOpenTime(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{openTime ? fmt12(openTime) : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {openTime && day[openTime] && (
              <Button variant="ghost" onClick={clear}>
                Clear
              </Button>
            )}
            <Button onClick={save}>Save block</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyPlanner;