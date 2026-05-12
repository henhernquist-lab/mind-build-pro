import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { getActiveSeason, daysRemaining, type Season } from "@/lib/seasons/api";

export const ChampionshipBanner = () => {
  const [season, setSeason] = useState<Season | null>(null);

  useEffect(() => {
    getActiveSeason().then(setSeason);
  }, []);

  if (!season) return null;

  const days = daysRemaining(season);
  const color = season.theme_color || "hsl(var(--primary))";

  return (
    <Link
      to="/championship"
      className="block rounded-2xl border border-border bg-card p-4 hover:border-primary transition-colors"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
          <Trophy className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-normalst text-muted-foreground">Active Championship</div>
          <div className="text-sm font-semibold truncate">{season.name}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-semibold tabular-nums">{days}</div>
          <div className="text-[10px] uppercase tracking-normalst text-muted-foreground">days left</div>
        </div>
      </div>
    </Link>
  );
};