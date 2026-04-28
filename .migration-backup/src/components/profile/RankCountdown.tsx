import { useEffect, useState } from "react";
import { getCountdown } from "@/lib/ranks2";
import { Clock } from "lucide-react";

export const RankCountdown = ({ periodStart, label }: { periodStart: string; label?: string }) => {
  const [c, setC] = useState(() => getCountdown(periodStart));
  useEffect(() => {
    const id = setInterval(() => setC(getCountdown(periodStart)), 60_000);
    return () => clearInterval(id);
  }, [periodStart]);
  return (
    <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{label ?? "Resets in"} {c.days}d {c.hours}h</span>
    </div>
  );
};
