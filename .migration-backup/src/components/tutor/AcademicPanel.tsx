import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Edit3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { fetchAcademicProfile, fetchClasses, AcademicProfile, AcademicClass } from "@/lib/academic";
import { cn } from "@/lib/utils";

export const AcademicPanel = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<AcademicProfile | null>(null);
  const [classes, setClasses] = useState<AcademicClass[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setP(await fetchAcademicProfile(user.id));
      setClasses(await fetchClasses(user.id));
    })();
  }, [user?.id]);

  const empty = !p && classes.length === 0;
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-3 mb-3 flex items-center justify-between gap-3">
        <div className="text-xs">📚 Add your Academic Profile for a fully personalized tutor experience</div>
        <Button size="sm" variant="outline" onClick={() => nav("/profile")}>Set up</Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card mb-3 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-accent/50">
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-semibold">My Academic Profile</span>
          {p?.gpa != null && (<span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">GPA {p.gpa.toFixed(2)}</span>)}
          {p?.grade_level && (<span className="text-[11px] text-muted-foreground">{p.grade_level}</span>)}
        </span>
        <span onClick={(e) => { e.stopPropagation(); nav("/profile"); }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
          <Edit3 className="h-3 w-3" /> Edit
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 space-y-2">
          {classes.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Classes</div>
              <div className="flex flex-wrap gap-1.5">
                {classes.map((c) => {
                  const isStrong = p?.strongest_subject === c.class_name;
                  const isWeak = p?.needs_improvement === c.class_name;
                  return (
                    <span key={c.id} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold border")} style={{
                      borderColor: isStrong ? "hsl(140 70% 45%)" : isWeak ? "hsl(38 90% 55%)" : "hsl(var(--border))",
                      color: isStrong ? "hsl(140 70% 45%)" : isWeak ? "hsl(38 90% 55%)" : "hsl(var(--foreground))",
                      background: isStrong ? "hsl(140 70% 45% / 0.08)" : isWeak ? "hsl(38 90% 55% / 0.08)" : "transparent",
                    }}>
                      {c.class_name}{c.current_grade ? ` · ${c.current_grade}` : ""}{c.difficulty !== "Standard" ? ` · ${c.difficulty}` : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {p?.academic_goals && p.academic_goals.length > 0 && (
            <div className="text-[11px] text-muted-foreground">🎯 {p.academic_goals.join(" · ")}</div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper to build studentProfile payload for tutor calls
export const buildStudentProfile = async (userId: string, baseAthletic: any, displayName: string) => {
  const ap = await fetchAcademicProfile(userId);
  const cls = await fetchClasses(userId);
  return {
    ...baseAthletic,
    name: displayName,
    academic: ap ? {
      grade_level: ap.grade_level,
      gpa: ap.gpa,
      gpa_weighted: ap.gpa_weighted,
      strongest: ap.strongest_subject,
      needs_improvement: ap.needs_improvement,
      study_style: ap.study_style,
      goals: ap.academic_goals,
      study_hours: ap.study_hours_per_day,
      homework_load: ap.homework_load,
    } : null,
    classes: cls.map((c) => ({ name: c.class_name, grade: c.current_grade, difficulty: c.difficulty })),
  };
};
