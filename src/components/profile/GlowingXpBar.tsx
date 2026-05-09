import { useEffect, useState } from "react";

interface Props {
  xp: number;
  nextXp: number | null;          // null = max rank
  rankName: string;
  rankIcon: string;
  rankColor?: string;
  label?: string;                 // e.g. "Athletic" / "Academic"
  ranks?: { name: string; icon: string; xpRequired: number; color: string }[]; // optional tier journey
}

/**
 * LifeStack premium rank card — championship-trophy energy.
 * - Holographic rotating border
 * - Bebas Neue rank name with shimmer-sweep
 * - Liquid-fill XP bar (defined in index.css) with shimmer
 * - Monospaced scoreboard XP number that counts up
 * - Pulses urgent when near rank-up threshold
 */
export const GlowingXpBar = ({ xp, nextXp, rankName, rankIcon, rankColor, label, ranks }: Props) => {
  const pct = nextXp == null ? 100 : Math.max(0, Math.min(100, (xp / nextXp) * 100));
  const nearRankUp = nextXp != null && pct >= 92;
  const [animatedXp, setAnimatedXp] = useState(0);

  // Tween the number from current animated value -> target xp (~700ms)
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

  const accent = rankColor || "hsl(var(--cyan))";

  return (
    <div className="holo-border lift" data-testid={`rank-card-${(label || "rank").toLowerCase()}`}>
      <div className="relative rounded-[calc(1.25rem-2px)] p-5 glass-strong">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Rank icon with glow */}
            <span
              className="text-5xl leading-none flex-shrink-0"
              style={{ filter: `drop-shadow(0 0 14px ${accent})` }}
              aria-hidden
            >
              {rankIcon}
            </span>
            <div className="min-w-0">
              {label && (
                <div className="text-[10px] font-stat text-muted-foreground leading-none mb-1 inline-flex items-center gap-1.5">
                  <span className="live-dot" aria-hidden />
                  {label}
                </div>
              )}
              <div
                className="font-display text-[32px] leading-none shimmer-text truncate"
                style={{ ["--rank-color" as any]: accent }}
              >
                {rankName.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="scoreboard text-2xl font-bold">
              <span style={{ color: accent }}>{animatedXp}</span>
              {nextXp != null && (
                <span className="text-muted-foreground font-normal text-sm">
                  {" / "}{nextXp}
                </span>
              )}
              <span className="text-muted-foreground font-normal text-[10px] ml-1 font-stat">XP</span>
            </div>
            {nextXp != null && (
              <div className="text-[10px] font-stat text-muted-foreground mt-0.5">
                {Math.max(0, nextXp - xp)} to next
              </div>
            )}
          </div>
        </div>

        {/* XP progress bar */}
        <div className="xp-bar-track h-3 mt-4">
          <div
            className={`xp-bar-fill ${nearRankUp ? "urgent" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Rank-tier journey strip */}
        {ranks && ranks.length > 0 && (
          <div className="mt-4 flex items-center gap-1" data-testid="rank-journey">
            {ranks.map((r, i) => {
              const reached = xp >= r.xpRequired;
              const current = r.name === rankName;
              return (
                <div key={r.name} className="flex-1 flex items-center gap-1 min-w-0">
                  <div
                    className={`flex flex-col items-center gap-0.5 transition-all duration-300 ${current ? "scale-110" : ""}`}
                    title={`${r.name} — ${r.xpRequired} XP`}
                  >
                    <span
                      className="text-base leading-none"
                      style={{
                        filter: reached ? `drop-shadow(0 0 8px ${r.color})` : "grayscale(0.85) opacity(0.45)",
                        animation: current ? "livePulse 1.6s ease-out infinite" : undefined,
                      }}
                      aria-hidden
                    >
                      {r.icon}
                    </span>
                    <span
                      className="text-[9px] font-stat tracking-wider"
                      style={{
                        color: reached ? r.color : "hsl(var(--muted-foreground))",
                        opacity: reached ? 1 : 0.55,
                      }}
                    >
                      {r.name.length > 8 ? r.name.slice(0, 7) + "…" : r.name.toUpperCase()}
                    </span>
                  </div>
                  {i < ranks.length - 1 && (
                    <div
                      className="flex-1 h-[2px] rounded-full"
                      style={{
                        background: reached
                          ? `linear-gradient(90deg, ${r.color}, ${ranks[i + 1].color})`
                          : "hsl(var(--muted) / 0.5)",
                        boxShadow: reached ? `0 0 8px ${r.color}88` : undefined,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
