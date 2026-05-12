import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Apple, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchAthletic } from "@/lib/profile";
import {
  fetchMeals, calculateTargets, sumDay, todayISO, MacroTargets,
} from "@/lib/nutrition";

/** Compact "Today's fuel" card for the Daily Planner dashboard. */
export const NutritionTodayCard = () => {
  const { user } = useAuth();
  const [targets, setTargets] = useState<MacroTargets | null>(null);
  const [totals, setTotals] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const ath = await fetchAthletic(user.id);
        if (ath && ath.weight_lbs > 0 && ath.age > 0) {
          setTargets(calculateTargets(ath));
        }
        const meals = await fetchMeals(user.id, todayISO());
        setTotals(sumDay(meals));
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading || !targets) return null;

  const calPct = Math.min(100, (totals.calories / targets.calories) * 100);
  const proPct = Math.min(100, (totals.protein_g / targets.protein_g) * 100);
  const remaining = Math.max(0, targets.calories - totals.calories);

  return (
    <Link
      to="/nutrition"
      className="block rounded-2xl glass p-4 hover:border-primary/40 transition-colors group mb-6"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sports/15 text-sports flex items-center justify-center">
            <Apple className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-normalst text-muted-foreground leading-none">Fuel today</div>
            <div className="text-sm font-semibold mt-0.5">
              {totals.calories} / {targets.calories} kcal
              <span className="text-xs text-muted-foreground font-normal ml-1.5">
                · {remaining} left
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <div className="space-y-1.5">
        <Bar label="Calories" pct={calPct} color="hsl(21 95% 55%)" current={totals.calories} target={targets.calories} unit="" />
        <Bar label="Protein" pct={proPct} color="hsl(0 70% 60%)" current={totals.protein_g} target={targets.protein_g} unit="g" />
      </div>
    </Link>
  );
};

const Bar = ({ label, pct, color, current, target, unit }: { label: string; pct: number; color: string; current: number; target: number; unit: string }) => (
  <div>
    <div className="flex justify-between text-[10px] mb-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{current}/{target}{unit}</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
    </div>
  </div>
);