// Daily study streak tracker. A "study day" is any day the user logged
// progress (planner block completed, vocab review, note saved, tutor question, etc.).
// 7-day streak grants a 1-day bonus XP multiplier (+50% via xpMultiplier).
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { sfx } from "@/lib/sounds";
import { toast } from "sonner";

export type StreakRow = {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  multiplier_active_until: string | null;
  total_study_days: number;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export const fetchStreak = async (userId: string): Promise<StreakRow> => {
  const { data } = await supabase
    .from("study_streak")
    .select("current_streak, longest_streak, last_study_date, multiplier_active_until, total_study_days")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    await supabase.from("study_streak").insert({ user_id: userId });
    return { current_streak: 0, longest_streak: 0, last_study_date: null, multiplier_active_until: null, total_study_days: 0 };
  }
  return data as any;
};

export const recordStudyActivity = async (
  userId: string
): Promise<{ row: StreakRow; bumped: boolean; rolled: boolean }> => {
  const today = todayISO();
  const row = await fetchStreak(userId);
  if (row.last_study_date === today) return { row, bumped: false, rolled: false };

  let newStreak = 1;
  let rolled = false;
  if (row.last_study_date) {
    const gap = daysBetween(row.last_study_date, today);
    if (gap === 1) newStreak = row.current_streak + 1;
    else if (gap > 1) {
      newStreak = 1;
      rolled = true;
    }
  }
  const longest = Math.max(row.longest_streak, newStreak);
  let multiplier_active_until = row.multiplier_active_until;
  if (newStreak > 0 && newStreak % 7 === 0) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    multiplier_active_until = tomorrow;
  }
  const updated: StreakRow = {
    current_streak: newStreak,
    longest_streak: longest,
    last_study_date: today,
    multiplier_active_until,
    total_study_days: row.total_study_days + 1,
  };
  await supabase.from("study_streak").update(updated).eq("user_id", userId);
  return { row: updated, bumped: true, rolled };
};

export const isMultiplierActive = (row: StreakRow | null): boolean => {
  if (!row?.multiplier_active_until) return false;
  return row.multiplier_active_until >= todayISO();
};

export const xpMultiplier = (row: StreakRow | null): number => (isMultiplierActive(row) ? 1.5 : 1);

export const useStreak = () => {
  const { user } = useAuth();
  const [row, setRow] = useState<StreakRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setRow(await fetchStreak(user.id));
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const ping = useCallback(async () => {
    if (!user) return;
    const { row: updated, bumped } = await recordStudyActivity(user.id);
    setRow(updated);
    if (bumped) {
      sfx.click();
      if (updated.current_streak > 1 && updated.current_streak % 7 === 0) {
        sfx.rankUp();
        toast.success(`🔥 ${updated.current_streak}-day streak!`, {
          description: "Bonus XP multiplier active for 24h (+50%)",
          duration: 7000,
        });
      } else if (updated.current_streak >= 2) {
        toast(`🔥 ${updated.current_streak}-day streak`, { duration: 2500 });
      }
    }
  }, [user]);

  return {
    row,
    loaded,
    reload,
    ping,
    multiplier: xpMultiplier(row),
    multiplierActive: isMultiplierActive(row),
  };
};
