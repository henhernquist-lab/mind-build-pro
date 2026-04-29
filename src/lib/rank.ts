// Rank/XP progression system for workouts
import { useEffect } from "react";
import { useLocalStorage } from "@/lib/storage";
import { toast } from "sonner";

export type Rank = {
  name: string;
  icon: string;
  xpRequired: number;
  color: string; // CSS var name (school/sports/coding) or hex
};

export const RANKS: Rank[] = [
  { name: "Recruit", icon: "🥉", xpRequired: 0, color: "hsl(var(--free))" },
  { name: "Varsity", icon: "🔵", xpRequired: 100, color: "hsl(var(--school))" },
  { name: "All-Star", icon: "⭐", xpRequired: 300, color: "hsl(var(--sports))" },
  { name: "Elite", icon: "🏆", xpRequired: 600, color: "hsl(var(--coding))" },
  { name: "Legend", icon: "🔥", xpRequired: 1000, color: "hsl(0 80% 60%)" },
];

export const XP_PER_WORKOUT = 10;
export const XP_PR_BONUS = 50;

export const getRank = (xp: number): Rank => {
  let r = RANKS[0];
  for (const candidate of RANKS) {
    if (xp >= candidate.xpRequired) r = candidate;
    else break;
  }
  return r;
};

export const getNextRank = (xp: number): Rank | null => {
  for (const r of RANKS) {
    if (xp < r.xpRequired) return r;
  }
  return null;
};

export type RankHistoryEntry = {
  monthKey: string; // "2026-04"
  monthName: string; // "March 2026"
  finalXp: number;
  highestRankName: string;
  highestRankIcon: string;
};

const monthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthName = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

export const useRankSystem = () => {
  const [xp, setXp] = useLocalStorage<number>("rank_xp", 0);
  const [storedMonth, setStoredMonth] = useLocalStorage<string>("rank_month", monthKey());
  const [history, setHistory] = useLocalStorage<RankHistoryEntry[]>("rank_history", []);
  const [resetNotice, setResetNotice] = useLocalStorage<string | null>("rank_reset_notice", null);

  // Monthly reset check on load
  useEffect(() => {
    const current = monthKey();
    if (storedMonth !== current) {
      const prevRank = getRank(xp);
      const entry: RankHistoryEntry = {
        monthKey: storedMonth,
        monthName: monthName(storedMonth),
        finalXp: xp,
        highestRankName: prevRank.name,
        highestRankIcon: prevRank.icon,
      };
      setHistory((h) => [entry, ...h].slice(0, 12));
      setXp(0);
      setStoredMonth(current);
      setResetNotice(storedMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show one-time reset toast
  useEffect(() => {
    if (resetNotice) {
      const last = history.find((h) => h.monthKey === resetNotice);
      toast.success("New month, fresh start!", {
        description: last
          ? `You finished ${last.monthName} as ${last.highestRankIcon} ${last.highestRankName} with ${last.finalXp} XP.`
          : "Your rank has been reset for the new month.",
        duration: 8000,
      });
      setResetNotice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNotice]);

  const addXp = (amount: number, opts?: { isPR?: boolean }) => {
    const before = xp;
    const after = before + amount;
    const beforeRank = getRank(before);
    const afterRank = getRank(after);
    setXp(after);
    return {
      rankedUp: beforeRank.name !== afterRank.name,
      newRank: afterRank,
      isPR: !!opts?.isPR,
    };
  };

  return {
    xp,
    rank: getRank(xp),
    nextRank: getNextRank(xp),
    history,
    addXp,
  };
};
