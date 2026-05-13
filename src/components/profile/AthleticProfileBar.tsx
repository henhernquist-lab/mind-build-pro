import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchAthletic, AthleticInfo, initialsFromName } from "@/lib/profile";
import { Button } from "@/components/ui/button";

export const AthleticProfileBar = () => {
  const { user, profile } = useAuth();
  const [a, setA] = useState<AthleticInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchAthletic(user.id).then((d) => { setA(d); setLoaded(true); });
  }, [user?.id]);

  if (!loaded) return null;

  const name = profile?.display_name || user?.email?.split("@")[0] || "Athlete";
  const incomplete = !a || (a.primary_sports.length === 0 && a.fitness_goals.length === 0);

  if (incomplete) {
    return (
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 mb-4 flex items-center gap-3">
        <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex-1 text-xs">
          Complete your Athletic Profile for personalized grading.
        </div>
        <Link to="/profile">
          <Button size="sm" variant="default" className="h-7 text-xs">Complete</Button>
        </Link>
      </div>
    );
  }

  const sport = [...a!.primary_sports.filter((s) => s !== "Other"), ...(a!.other_sport ? [a!.other_sport] : [])][0];
  const goal = a!.fitness_goals[0];

  return (
    <div className="rounded-xl border border-border bg-card p-3 mb-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold flex-shrink-0 border border-border" style={{ background: profile?.avatar_url ? "transparent" : "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          : initialsFromName(name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{name}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          {a!.height_ft}'{a!.height_in}" · {a!.weight_lbs} lb
          {sport ? ` · ${sport}` : ""}
          {goal ? ` · 🎯 ${goal}` : ""}
        </div>
      </div>
      <Link to="/profile" className="text-[11px] text-primary hover:underline flex items-center gap-1 flex-shrink-0">
        <Pencil className="h-3 w-3" /> Edit
      </Link>
    </div>
  );
};