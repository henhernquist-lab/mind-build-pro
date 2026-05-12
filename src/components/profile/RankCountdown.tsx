import { useEffect, useState } from "react";
import { getCountdown } from "@/lib/ranks2";

export const RankCountdown = ({ periodStart, label }: { periodStart: string; label?: string }) => {
  const [c, setC] = useState(() => getCountdown(periodStart));
  useEffect(() => {
    const id = setInterval(() => setC(getCountdown(periodStart)), 60_000);
    return () => clearInterval(id);
  }, [periodStart]);
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] tracking-normalr"
      style={{
        background: "hsl(var(--pr-red) / 0.10)",
        border: "1px solid hsl(var(--pr-red) / 0.30)",
        color: "hsl(var(--pr-red))",
      }}
      data-testid="rank-countdown"
    >
      <span className="live-dot" aria-hidden />
      <span className="text-foreground/85">{label ?? "RESETS IN"}</span>
      <span className="scoreboard font-semibold">
        {c.days}d {c.hours}h
      </span>
    </div>
  );
};
