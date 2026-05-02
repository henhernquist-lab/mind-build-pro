import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRank, getCountdown } from "@/lib/ranks2";

export type AceSuggestion = {
  text: string;
  priority: number; // lower = more urgent
};

/**
 * Aggregates proactive triggers for Ace. Returns the highest-priority suggestion
 * (or null). Refreshes every 5 minutes.
 */
export const useAceSuggestion = () => {
  const { user } = useAuth();
  const athletic = useRank("athletic");
  const academic = useRank("academic");
  const [suggestion, setSuggestion] = useState<AceSuggestion | null>(null);

  useEffect(() => {
    if (!user) { setSuggestion(null); return; }
    let cancelled = false;

    const compute = async () => {
      const list: AceSuggestion[] = [];

      // 1. Season ending
      for (const [type, r] of [["athletic", athletic], ["academic", academic]] as const) {
        if (!r.periodStart) continue;
        const c = getCountdown(r.periodStart);
        if (c.total > 0 && c.total <= 24 * 3600 * 1000) {
          const hours = Math.max(1, c.days * 24 + c.hours);
          list.push({
            text: `Heads up — your ${type} season ends in ~${hours}h. Last chance to climb the ranks!`,
            priority: 1,
          });
        } else if (c.total > 0 && c.total <= 48 * 3600 * 1000) {
          list.push({
            text: `Your ${type} season ends in under 2 days — let's grind some XP.`,
            priority: 3,
          });
        }
      }

      // 2. No workout in 3+ days
      const since = new Date(Date.now() - 3 * 86400000).toISOString();
      const { count: recentWorkouts } = await supabase
        .from("workout_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("logged_at", since);
      if ((recentWorkouts ?? 0) === 0) {
        list.push({
          text: "It's been 3+ days since your last workout. Want help planning a quick session?",
          priority: 4,
        });
      }

      // 3. Macros not started past 2pm
      const now = new Date();
      if (now.getHours() >= 14) {
        const today = now.toISOString().slice(0, 10);
        const { count: mealsToday } = await supabase
          .from("meal_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("log_date", today);
        if ((mealsToday ?? 0) === 0) {
          list.push({
            text: "You haven't logged any meals yet today — let's get those macros in.",
            priority: 5,
          });
        }
      }

      // 4. Class grade below B (numerical < 80 or letter starts with C/D/F)
      const { data: classes } = await supabase
        .from("academic_classes")
        .select("class_name, current_grade, current_grade_pct")
        .eq("user_id", user.id);
      const weak = (classes || []).find((c: any) => {
        if (c.current_grade_pct != null && c.current_grade_pct < 80) return true;
        const g = (c.current_grade || "").trim().toUpperCase();
        return /^[CDF]/.test(g);
      });
      if (weak) {
        list.push({
          text: `Your ${(weak as any).class_name} grade could use some love. Want a quick practice problem?`,
          priority: 6,
        });
      }

      list.sort((a, b) => a.priority - b.priority);
      if (!cancelled) setSuggestion(list[0] ?? null);
    };

    compute();
    const id = setInterval(compute, 5 * 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user?.id, athletic.periodStart, academic.periodStart]);

  return suggestion;
};

const SEEN_KEY = "ace:suggestion-seen";
export const markSuggestionSeen = (text: string) => {
  try { localStorage.setItem(SEEN_KEY, text); } catch {}
};
export const hasSeenSuggestion = (text: string) => {
  try { return localStorage.getItem(SEEN_KEY) === text; } catch { return false; }
};