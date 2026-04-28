import { useEffect, useState } from "react";

interface Props {
  xp: number;
  nextXp: number | null;          // null = max rank
  rankName: string;
  rankIcon: string;
  rankColor?: string;
  label?: string;                 // e.g. "Athletic" / "Academic"
}

/**
 * Animated glowing XP bar with shimmer, gradient sweep, and number tween.
 */
export const GlowingXpBar = ({ xp, nextXp, rankName, rankIcon, rankColor, label }: Props) => {
  const pct = nextXp == null ? 100 : Math.max(0, Math.min(100, (xp / nextXp) * 100));
  const [animatedXp, setAnimatedXp] = useState(0);

  // Tween the number over ~700ms
  useEffect(() => {
    const start = animatedXp;
    const delta = xp - start;
    if (delta === 0) return;
    const duration = 700;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedXp(Math.round(start + delta * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp]);

  return (
    <div className="rounded-2xl glass p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none" style={{ filter: `drop-shadow(0 0 8px ${rankColor || "hsl(var(--primary))"})` }}>
            {rankIcon}
          </span>
          <div>
            {label && (
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground leading-none">
                {label}
              </div>
            )}
            <div className="text-sm font-bold leading-tight" style={{ color: rankColor }}>
              {rankName}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-bold tabular-nums">
            {animatedXp}
            <span className="text-muted-foreground font-normal">
              {nextXp != null ? ` / ${nextXp}` : ""} XP
            </span>
          </div>
          {nextXp != null && (
            <div className="text-[10px] text-muted-foreground">
              {Math.max(0, nextXp - xp)} to next rank
            </div>
          )}
        </div>
      </div>
      <div className="xp-bar-track h-3">
        <div
          className="xp-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};