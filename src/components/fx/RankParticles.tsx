import { useMemo } from "react";

interface Props {
  /** Hex/HSL color string for particles */
  color?: string;
  /** Particle count (default 8) */
  count?: number;
  /** Pause the rising animation (e.g. when reduced motion or no XP yet) */
  active?: boolean;
}

/**
 * Tiny rising-sparks overlay — meant to sit absolutely on top of the XP bar.
 * Each particle has slightly different left, delay, duration, drift and size.
 * CSS does the heavy lifting (animation: rankParticleRise).
 */
export const RankParticles = ({ color = "hsl(var(--cyan))", count = 8, active = true }: Props) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const left = Math.round((i / count) * 100 + (Math.random() * 8 - 4));
        const delay = Math.round(Math.random() * 1800);
        const dur = (1.8 + Math.random() * 1.6).toFixed(2);
        const dx = Math.round((Math.random() - 0.5) * 16);
        const size = (3 + Math.random() * 2).toFixed(1);
        return { left, delay, dur, dx, size, key: i };
      }),
    [count],
  );

  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-1 h-10 overflow-visible" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.key}
          className="rank-particle"
          style={{
            left: `${p.left}%`,
            bottom: 0,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: color,
            boxShadow: `0 0 6px ${color}`,
            animationDelay: `${p.delay}ms`,
            ["--dur" as any]: `${p.dur}s`,
            ["--dx" as any]: `${p.dx}px`,
          }}
        />
      ))}
    </div>
  );
};
