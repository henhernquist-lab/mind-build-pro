import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchAchievements, type AchievementRow } from "@/lib/achievements";
import { BADGES, rarityClasses } from "@/lib/badges";
import { cn } from "@/lib/utils";

export const BadgeGallery = () => {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<Record<string, AchievementRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const rows = await fetchAchievements(user.id);
      const map: Record<string, AchievementRow> = {};
      rows.forEach((r) => (map[r.badge_id] = r));
      setUnlocked(map);
      setLoading(false);
    })();
  }, [user?.id]);

  const unlockedCount = Object.keys(unlocked).length;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Trophy className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-semibold">Achievements</h2>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {unlockedCount} / {BADGES.length}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {BADGES.map((b, i) => {
          const has = !!unlocked[b.id];
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                "group relative rounded-xl border p-3 text-center transition-all",
                has
                  ? "border-border bg-background/40 hover:scale-[1.04]"
                  : "border-border/40 bg-background/20 opacity-60",
              )}
              title={`${b.name} — ${b.desc}`}
            >
              <div
                className={cn(
                  "mx-auto mb-1.5 h-12 w-12 rounded-xl bg-gradient-to-br shadow-md flex items-center justify-center text-2xl",
                  has ? rarityClasses(b.rarity) : "from-muted to-muted text-muted-foreground/40 shadow-none",
                )}
              >
                {has ? b.emoji : <Lock className="h-4 w-4" />}
              </div>
              <div className="text-[11px] font-bold leading-tight line-clamp-2">{b.name}</div>
              <div className="text-[9px] uppercase tracking-widest mt-0.5 text-muted-foreground">
                {b.rarity}
              </div>
            </motion.div>
          );
        })}
      </div>
      {loading && <div className="text-xs text-muted-foreground mt-3 text-center">Loading…</div>}
    </section>
  );
};

export default BadgeGallery;