import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  "": "Planner",
  workouts: "Workouts",
  tutor: "AI Tutor",
  tests: "Tests",
  vocab: "Vocab",
  notes: "Notes",
  profile: "Profile",
  games: "Games",
  bosses: "Boss Battles",
  flashcards: "Flashcards",
  debate: "Debate",
  georgia: "Georgia Conquest",
  dungeon: "Algebra Dungeon",
};

export const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null; // hide on root planner

  let acc = "";
  const crumbs = [{ label: "Home", to: "/" }];
  for (const p of parts) {
    acc += "/" + p;
    crumbs.push({ label: LABELS[p] ?? p, to: acc });
  }

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground px-4 md:px-6 pt-3" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={c.to} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {i === crumbs.length - 1 ? (
            <span className="text-foreground font-semibold">{c.label}</span>
          ) : (
            <Link to={c.to} className="hover:text-foreground transition-colors">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
};
