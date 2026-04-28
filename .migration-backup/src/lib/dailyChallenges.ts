import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ChallengeKind =
  | "earn_xp"        // earn N total XP
  | "vocab_review"   // review N vocab cards
  | "blitz_solve"    // solve N math problems in Blitz
  | "boss_round"     // win N boss rounds
  | "log_workout"    // log N workouts
  | "save_note";     // save N notes

export interface ChallengeTemplate {
  id: ChallengeKind;
  title: string;
  description: (target: number) => string;
  category: "academic" | "athletic" | "games";
  base: number;       // base target
  xpReward: number;
  weight: number;     // selection weight
}

const TEMPLATES: ChallengeTemplate[] = [
  { id: "earn_xp",      title: "Daily Grind",       description: (n) => `Earn ${n} XP from any activity`,    category: "academic", base: 50, xpReward: 25, weight: 3 },
  { id: "vocab_review", title: "Word of the Day",   description: (n) => `Review ${n} vocab cards`,           category: "academic", base: 5,  xpReward: 20, weight: 2 },
  { id: "blitz_solve",  title: "Speed Demon",       description: (n) => `Solve ${n} problems in Speed Math Blitz`, category: "games", base: 15, xpReward: 30, weight: 2 },
  { id: "boss_round",   title: "Boss Hunter",       description: (n) => `Win ${n} boss-battle rounds`,       category: "games",    base: 3,  xpReward: 30, weight: 2 },
  { id: "log_workout",  title: "Move Today",        description: (n) => `Log ${n} workout`,                  category: "athletic", base: 1,  xpReward: 25, weight: 2 },
  { id: "save_note",    title: "Show Your Work",    description: (n) => `Save ${n} new study note`,          category: "academic", base: 1,  xpReward: 20, weight: 1 },
];

export interface DailyChallenge {
  id: string;
  challenge_id: ChallengeKind;
  title: string;
  description: string;
  target: number;
  progress: number;
  xp_reward: number;
  category: string;
  claimed: boolean;
  challenge_date: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Pseudo-random selection seeded by date+userId so the day's set is stable. */
const seededShuffle = <T>(arr: T[], seed: string): T[] => {
  const a = [...arr];
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Loads (or generates if missing) the user's 3 daily challenges for today. */
export const getDailyChallenges = async (userId: string): Promise<DailyChallenge[]> => {
  const date = todayISO();
  const { data: existing } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("challenge_date", date);
  if (existing && existing.length >= 3) return existing as unknown as DailyChallenge[];

  // Generate 3 unique challenges
  const picks = seededShuffle(TEMPLATES, `${userId}-${date}`).slice(0, 3);
  const rows = picks.map((t) => ({
    user_id: userId,
    challenge_date: date,
    challenge_id: t.id,
    title: t.title,
    description: t.description(t.base),
    target: t.base,
    progress: 0,
    xp_reward: t.xpReward,
    category: t.category,
    claimed: false,
  }));
  await supabase.from("daily_challenges").upsert(rows, {
    onConflict: "user_id,challenge_date,challenge_id",
    ignoreDuplicates: true,
  });
  const { data: fresh } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("challenge_date", date);
  return (fresh ?? []) as unknown as DailyChallenge[];
};

/** Increment progress on any daily challenge matching the given kind for today. */
export const incrementChallengeProgress = async (
  userId: string,
  kind: ChallengeKind,
  amount = 1,
) => {
  if (amount <= 0) return;
  const date = todayISO();
  const { data: row } = await supabase
    .from("daily_challenges")
    .select("id, progress, target, claimed")
    .eq("user_id", userId)
    .eq("challenge_date", date)
    .eq("challenge_id", kind)
    .maybeSingle();
  if (!row) return;
  const newProgress = Math.min(row.target, row.progress + amount);
  if (newProgress === row.progress) return;
  await supabase
    .from("daily_challenges")
    .update({ progress: newProgress })
    .eq("id", row.id);
  if (newProgress >= row.target && row.progress < row.target && !row.claimed) {
    toast.success("🎯 Daily challenge complete!", {
      description: "Head to your dashboard to claim your XP.",
      duration: 5000,
    });
  }
};

/** Mark as claimed and return XP to grant. Returns 0 if not claimable. */
export const claimChallenge = async (challengeId: string): Promise<number> => {
  const { data: row } = await supabase
    .from("daily_challenges")
    .select("xp_reward, progress, target, claimed")
    .eq("id", challengeId)
    .maybeSingle();
  if (!row || row.claimed || row.progress < row.target) return 0;
  await supabase
    .from("daily_challenges")
    .update({ claimed: true })
    .eq("id", challengeId);
  return row.xp_reward;
};