import { useStreak } from "@/lib/streak";
import { Flame } from "lucide-react";

export const StreakBadge = ({ compact = false }: { compact?: boolean }) => {
  const { row, multiplierActive } = useStreak();
  const streak = row?.current_streak ?? 0;
  if (streak === 0 && !compact) return null;

  const style =
    streak >= 7
      ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/40 text-orange-300"
      : streak >= 3
      ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
      : "bg-card border-border text-muted-foreground";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-all ${style}`}
      title={`Current streak: ${streak} days${multiplierActive ? " • XP x1.5 active" : ""}`}
    >
      <Flame className={`h-3.5 w-3.5 ${streak > 0 ? "text-orange-400" : ""}`} />
      <span>{streak}</span>
      {multiplierActive && <span className="text-[9px] uppercase tracking-wider">x1.5</span>}
    </div>
  );
};
