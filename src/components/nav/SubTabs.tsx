import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type SubTab = { to: string; label: string };

const GROUPS: { match: (p: string) => boolean; tabs: SubTab[] }[] = [
  {
    match: (p) => p === "/workouts" || p === "/nutrition" || p === "/macros",
    tabs: [
      { to: "/workouts", label: "Workouts" },
      { to: "/nutrition", label: "Nutrition" },
    ],
  },
  {
    match: (p) => ["/tutor", "/tests", "/vocab", "/notes", "/practice"].includes(p),
    tabs: [
      { to: "/tutor", label: "AI Tutor" },
      { to: "/practice", label: "Practice Tests" },
      { to: "/tests", label: "Tests" },
      { to: "/vocab", label: "Vocab" },
      { to: "/notes", label: "Notes" },
    ],
  },
  {
    match: (p) => p === "/leaderboard" || p === "/championship",
    tabs: [
      { to: "/leaderboard", label: "Leaderboard" },
      { to: "/championship", label: "Championship" },
    ],
  },
];

export const SubTabs = () => {
  const { pathname } = useLocation();
  const group = GROUPS.find((g) => g.match(pathname));
  if (!group) return null;

  return (
    <div className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
      <div className="flex gap-1 px-3 py-2 overflow-x-auto no-scrollbar">
        {group.tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/60 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
};