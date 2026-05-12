import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, Droplets, X, AlertTriangle, Plus } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  MEAL_TYPES, MealLog, MacroTargets, fetchMeals, deleteMeal, sumDay, todayISO,
} from "@/lib/nutrition";
import { fetchWaterLogsRange } from "@/lib/water";
import type { WaterLog } from "@/lib/water";

interface DayDetailDrawerProps {
  open: boolean;
  date: string;
  userId: string;
  targets: MacroTargets | null;
  waterGoalMl: number;
  onClose: () => void;
  onDateChange: (d: string) => void;
  onMealDeleted: (id: string) => void;
  onLogMealForDate: (date: string) => void;
}

const DRINK_EMOJI: Record<string, string> = {
  water: "💧",
  sports_drink: "🟦",
  juice: "🍊",
  coffee: "☕",
  tea: "🍵",
  soda: "🥤",
  other: "🫗",
};

const MacroBar = ({
  label, value, target, unit, color,
}: { label: string; value: number; target: number; unit: string; color: string }) => {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const over = target > 0 && value > target;
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}/{target}{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: over ? "hsl(0 70% 55%)" : color }}
        />
      </div>
    </div>
  );
};

export const DayDetailDrawer = ({
  open, date, userId, targets, waterGoalMl, onClose, onDateChange, onMealDeleted, onLogMealForDate,
}: DayDetailDrawerProps) => {
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [waterExpanded, setWaterExpanded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const today = todayISO();
  const isPast = date < today;
  const isToday = date === today;

  const prevDay = () => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - 1);
    onDateChange(d.toLocaleDateString("en-CA"));
  };

  const nextDay = () => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const next = d.toLocaleDateString("en-CA");
    if (next <= today) onDateChange(next);
  };

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    Promise.all([
      fetchMeals(userId, date),
      fetchWaterLogsRange(userId, date, date),
    ]).then(([m, w]) => {
      setMeals(m);
      setWaterLogs(w);
    }).finally(() => setLoading(false));
  }, [open, date, userId]);

  const totals = sumDay(meals);
  const totalWaterMl = waterLogs.reduce((s, l) => s + l.hydration_credit_ml, 0);
  const waterPct = waterGoalMl > 0 ? Math.min(100, (totalWaterMl / waterGoalMl) * 100) : 0;
  const waterGoalHit = totalWaterMl >= waterGoalMl && waterGoalMl > 0;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMeal(deleteTarget);
      setMeals((prev) => prev.filter((m) => m.id !== deleteTarget));
      onMealDeleted(deleteTarget);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  const content = (
    <div className="flex flex-col h-full max-h-[85vh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <button onClick={prevDay} className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="text-lg font-semibold">{dateLabel}</div>
          {!isToday && (
            <button onClick={() => onDateChange(today)} className="text-xs text-primary hover:underline">
              ← Today
            </button>
          )}
        </div>
        <button
          onClick={nextDay}
          disabled={date >= today}
          className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {loading ? (
          <div className="space-y-2 pt-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Macro summary */}
            {targets && (
              <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2.5">
                <div className="text-[11px] uppercase tracking-normalr text-muted-foreground font-semibold mb-1">
                  {isToday ? "Today's Macros" : isPast ? "Day Summary" : "Macros"}
                </div>
                <MacroBar label="Calories" value={totals.calories} target={targets.calories} unit="" color="hsl(21 95% 55%)" />
                <MacroBar label="Protein" value={totals.protein_g} target={targets.protein_g} unit="g" color="hsl(0 70% 60%)" />
                <MacroBar label="Carbs" value={totals.carbs_g} target={targets.carbs_g} unit="g" color="hsl(40 85% 55%)" />
                <MacroBar label="Fat" value={totals.fat_g} target={targets.fat_g} unit="g" color="hsl(200 70% 55%)" />
              </div>
            )}

            {/* Water summary */}
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setWaterExpanded((v) => !v)}
              >
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold">Water</span>
                  <span className="text-xs text-muted-foreground">
                    {(totalWaterMl / 1000).toFixed(1)}L / {(waterGoalMl / 1000).toFixed(1)}L
                  </span>
                  <span>{waterGoalHit ? "✅" : "❌"}</span>
                </div>
                <ChevronLeft className={cn("h-4 w-4 text-muted-foreground transition-transform", waterExpanded ? "-rotate-90" : "rotate-180")} />
              </button>
              <div className="mt-2">
                <Progress value={waterPct} className="h-2 [&>div]:bg-blue-400" />
              </div>
              <AnimatePresence>
                {waterExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-1.5">
                      {waterLogs.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-2">No water logged this day.</div>
                      ) : (
                        waterLogs.map((w) => (
                          <div key={w.id} className="flex items-center gap-2 text-xs rounded-lg bg-muted/40 px-3 py-2">
                            <span className="text-base">{DRINK_EMOJI[w.drink_type] ?? "💧"}</span>
                            <span className="font-medium">{w.amount_ml}ml</span>
                            <span className="text-muted-foreground capitalize">{w.drink_type.replace("_", " ")}</span>
                            <span className="ml-auto text-muted-foreground">
                              {new Date(w.logged_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {w.input_method === "camera_scan" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">📷</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Meal cards */}
            <div>
              <div className="text-[11px] uppercase tracking-normalr text-muted-foreground font-semibold mb-2">
                Meals ({meals.length})
              </div>
              {meals.length === 0 ? (
                <div className="rounded-xl border border-border bg-card/40 p-6 text-center">
                  <div className="text-sm text-muted-foreground mb-3">No meals logged for this day.</div>
                  <Button size="sm" onClick={() => { onClose(); onLogMealForDate(date); }}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Log a Meal
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {meals.map((m) => {
                      const mt = MEAL_TYPES.find((x) => x.id === m.meal_type);
                      const logTime = new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                      return (
                        <motion.div
                          key={m.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-3"
                        >
                          <span className="text-xl flex-shrink-0 mt-0.5">{mt?.emoji ?? "🍽️"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] uppercase tracking-normalr font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {mt?.label}
                              </span>
                              {m.ai_estimated && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">📷 AI</span>
                              )}
                              <span className="text-[10px] text-muted-foreground">{logTime}</span>
                            </div>
                            <div className="text-sm font-medium truncate mt-0.5">{m.description}</div>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-medium">🔵 {m.calories}kcal</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">🟠 {m.protein_g}g protein</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">🟢 {m.carbs_g}g carbs</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">🟡 {m.fat_g}g fat</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setDeleteTarget(m.id)}
                            className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0 transition-colors"
                            aria-label="Delete meal"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: bottom drawer */}
      <div className="md:hidden">
        <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
          <DrawerContent className="max-h-[90vh]">
            {content}
          </DrawerContent>
        </Drawer>
      </div>

      {/* Desktop: inline panel below calendar — rendered via portal-like approach */}
      {open && (
        <div className="hidden md:block fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
          <div
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            {content}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Delete meal?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove this meal entry. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
