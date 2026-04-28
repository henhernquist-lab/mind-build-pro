// Badge catalog + evaluator. Pure data + functions; persistence in src/lib/achievements.ts.

export type BadgeId =
  | "first_xp"
  | "rank_up_athletic"
  | "rank_up_academic"
  | "blitz_30"
  | "blitz_50"
  | "boss_slayer"
  | "streak_3"
  | "streak_7"
  | "vocab_25"
  | "test_logged"
  | "note_taker"
  | "pr_machine"
  | "combo_8";

export type Badge = {
  id: BadgeId;
  name: string;
  emoji: string;
  desc: string;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export const BADGES: Badge[] = [
  { id: "first_xp",           name: "First Steps",       emoji: "✨", desc: "Earn your first XP",                  rarity: "common" },
  { id: "streak_3",           name: "On a Roll",         emoji: "🔥", desc: "Hit a 3-day study streak",            rarity: "common" },
  { id: "test_logged",        name: "Planner",           emoji: "📅", desc: "Log your first upcoming test",        rarity: "common" },
  { id: "note_taker",         name: "Note Taker",        emoji: "📝", desc: "Save your first study note",          rarity: "common" },
  { id: "rank_up_athletic",   name: "Iron Climber",      emoji: "💪", desc: "Rank up in Athletic",                 rarity: "rare" },
  { id: "rank_up_academic",   name: "Honor Bound",       emoji: "🎓", desc: "Rank up in Academic",                 rarity: "rare" },
  { id: "vocab_25",           name: "Wordsmith",         emoji: "📖", desc: "Master 25 vocab words",               rarity: "rare" },
  { id: "blitz_30",           name: "Quick Mind",        emoji: "⚡", desc: "Solve 30+ in Speed Math Blitz",       rarity: "rare" },
  { id: "combo_8",            name: "Inferno",           emoji: "🔥", desc: "Hit an 8x combo streak",              rarity: "epic" },
  { id: "boss_slayer",        name: "Boss Slayer",       emoji: "⚔️", desc: "Defeat any subject boss",             rarity: "epic" },
  { id: "pr_machine",         name: "PR Machine",        emoji: "🏆", desc: "Set 5 lifetime personal records",     rarity: "epic" },
  { id: "blitz_50",           name: "Lightning Brain",   emoji: "🧠", desc: "Solve 50+ in Speed Math Blitz",       rarity: "legendary" },
  { id: "streak_7",           name: "Week Warrior",      emoji: "👑", desc: "Hit a 7-day study streak",            rarity: "legendary" },
];

export const BADGE_MAP: Record<BadgeId, Badge> = BADGES.reduce(
  (acc, b) => ((acc[b.id] = b), acc),
  {} as Record<BadgeId, Badge>,
);

export const rarityClasses = (r: Badge["rarity"]) =>
  r === "legendary"
    ? "from-amber-400 via-orange-500 to-rose-500 text-white shadow-amber-500/40"
    : r === "epic"
    ? "from-fuchsia-500 to-violet-600 text-white shadow-fuchsia-500/30"
    : r === "rare"
    ? "from-sky-500 to-blue-600 text-white shadow-sky-500/30"
    : "from-slate-500 to-slate-700 text-white shadow-slate-500/20";