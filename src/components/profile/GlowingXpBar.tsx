import { useEffect, useState } from "react";
import { RankParticles } from "@/components/fx/RankParticles";

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
 * - Holographic 4-color rotating border (cyan→neon→gold→purple)
 * - Bebas Neue 40px rank name with shimmer-sweep
 * - 52px rank icon with soft glow pulse
 * - Liquid-fill XP bar with shimmer + rising spark particles
 * - Monospaced scoreboard XP that counts up over 1.2s
 * - Pulses urgent when near rank-up threshold
 */
export const GlowingXpBar = ({ xp, nextXp, rankName, rankIcon, rankColor, label, ranks }: Props) => {
  const pct = nextXp == null ? 100 : Math.max(0, Math.min(100, (xp / nextXp) * 100));
  const nearRankUp = nextXp != null && pct >= 92;
  const [animatedXp, setAnimatedXp] = useState(0);
  const [rankUp, setRankUp] = useState(false);
  const [prevRank, setPrevRank] = useState(rankName);

  // Tween the number from current animated value -> target xp (~1200ms cubic ease-out)
  useEffect(() => {
    const start = animatedXp;
    const delta = xp - start;
    if (delta === 0) return;
    const duration = 1200;
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

  // Detect rank-up — fire dramatic burst class for 1.2s
  useEffect(() => {
    if (rankName !== prevRank) {
      setRankUp(true);
      const t = window.setTimeout(() => setRankUp(false), 1500);
      setPrevRank(rankName);
      return () => window.clearTimeout(t);
    }
  }, [rankName, prevRank]);

  const accent = rankColor || "hsl(var(--cyan))";

  return (
    <div className={`holo-border lift ${rankUp ? "ranking-up" : ""}`} data-testid={`rank-card-${(label || "rank").toLowerCase()}`}>
      <div className="relative rounded-[calc(1.25rem-2px)] p-5 glass-strong">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Rank icon — 52px with breathing soft glow in rank color */}
            <span
              className="leading-none flex-shrink-0"
              style={{
                fontSize: "52px",
                filter: `drop-shadow(0 0 16px ${accent})`,
                animation: "livePulse 3s ease-in-out infinite",
              }}
              aria-hidden
            >
              {rankIcon}
            </span>
            <div className="min-w-0">
              {label && (
                <div className="text-[10px] text-muted-foreground leading-none mb-1 inline-flex items-center gap-1.5">
                  <span className="live-dot" aria-hidden />
                  {label}
                </div>
              )}
              <div
                className="text-[40px] leading-none truncate"
                style={{ ["--rank-color" as any]: accent }}
              >
                {rankName.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="scoreboard text-xl font-semibold" key={`xp-${animatedXp}`}>
              <span style={{ color: accent }}>{animatedXp}</span>
              {nextXp != null && (
                <span className="text-muted-foreground font-normal text-sm">
                  {" / "}{nextXp}
                </span>
              )}
              <span className="text-muted-foreground font-normal text-[10px] ml-1">XP</span>
            </div>
            {nextXp != null && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {Math.max(0, nextXp - xp)} to next
              </div>
            )}
          </div>
        </div>

        {/* XP progress bar with rising particles overlay */}
        <div className="relative mt-4">
          <RankParticles color={accent} count={pct > 0 ? 8 : 0} active={pct > 0} />
          <div className="xp-bar-track h-3 relative">
            <div
              className={`xp-bar-fill ${nearRankUp ? "urgent" : ""}`}
              style={{ width: `${pct}%` }}
            />
            {/* Lighter leading edge — emphasises the liquid front */}
            {pct > 1 && pct < 100 && (
              <span
                aria-hidden
                className="absolute top-0 bottom-0 w-2 rounded-full"
                style={{
                  left: `calc(${pct}% - 4px)`,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.25))",
                  boxShadow: `0 0 10px ${accent}, 0 0 22px ${accent}`,
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
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
                      className="text-[9px] tracking-normalr"
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
