import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";
import { BADGE_MAP, type BadgeId } from "@/lib/badges";

export interface AchievementRow {
  badge_id: string;
  unlocked_at: string;
  progress: number;
}

/** Unlock a badge (idempotent). Fires toast + sound on first unlock. */
export const unlockBadge = async (userId: string, badgeId: BadgeId, progress = 0) => {
  const meta = BADGE_MAP[badgeId];
  if (!meta) return false;
  // Check existence first to avoid spammy toasts
  const { data: existing } = await supabase
    .from("achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_id", badgeId)
    .maybeSingle();
  if (existing) return false;

  const { error } = await supabase
    .from("achievements")
    .insert({ user_id: userId, badge_id: badgeId, progress });
  if (error) return false;

  sfx.rankUp();
  toast.success(`${meta.emoji} Achievement Unlocked`, {
    description: `${meta.name} — ${meta.desc}`,
    duration: 6000,
  });
  return true;
};

export const fetchAchievements = async (userId: string): Promise<AchievementRow[]> => {
  const { data } = await supabase
    .from("achievements")
    .select("badge_id, unlocked_at, progress")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });
  return (data ?? []) as AchievementRow[];
};