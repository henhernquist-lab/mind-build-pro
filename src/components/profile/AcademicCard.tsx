import { forwardRef } from "react";
import { GraduationCap, Trophy, Star } from "lucide-react";
import { ACADEMIC_RANKS, getRank } from "@/lib/ranks2";

export type AcademicCardData = {
  displayName: string;
  gradeLevel?: string | null;
  gpa?: number | null;
  gpaWeighted?: boolean;
  classes?: { class_name: string; current_grade?: string | null }[];
  goals?: string[];
  strongest?: string | null;
  needs?: string | null;
  academicXp?: number;
};

export const AcademicCard = forwardRef<HTMLDivElement, { data: AcademicCardData }>(({ data }, ref) => {
  const rank = getRank(data.academicXp ?? 0, ACADEMIC_RANKS);
  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-3xl border-2 p-6 md:p-7 text-foreground"
      style={{
        background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--background)))",
        borderColor: rank.color,
        boxShadow: `0 0 50px -10px ${rank.color}55`,
      }}
    >
      <div aria-hidden className="absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: rank.color }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Academic</div>
          <h2 className="text-2xl md:text-3xl font-bold leading-tight truncate">{data.displayName}</h2>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {data.gradeLevel && (<span className="inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {data.gradeLevel}</span>)}
            {(data.academicXp ?? 0) > 0 && (<span className="inline-flex items-center gap-1"><Trophy className="h-3 w-3" /> {data.academicXp} Academic XP</span>)}
          </div>
        </div>
        <div className="flex-shrink-0 rounded-xl px-2.5 py-1.5 text-center" style={{ background: `${rank.color}22`, border: `1px solid ${rank.color}55` }}>
          <div className="text-xl leading-none">{rank.icon}</div>
          <div className="text-[10px] font-semibold mt-0.5 uppercase tracking-wide" style={{ color: rank.color }}>{rank.name}</div>
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card/60 py-2 text-center">
          <div className="text-base md:text-lg font-bold tabular-nums">{data.gpa != null ? data.gpa.toFixed(2) : "—"}</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">GPA {data.gpaWeighted ? "(Weighted)" : ""}</div>
        </div>
        <div className="rounded-xl border border-border bg-card/60 py-2 text-center">
          <div className="text-base md:text-lg font-bold tabular-nums">{data.classes?.length ?? 0}</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Classes</div>
        </div>
      </div>
      {data.classes && data.classes.length > 0 && (
        <div className="relative mt-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Classes</div>
          <div className="flex flex-wrap gap-1.5">
            {data.classes.map((c, i) => (
              <span key={i} className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "hsl(var(--school) / 0.15)", color: "hsl(var(--school))", border: "1px solid hsl(var(--school) / 0.35)" }}>
                {c.class_name}{c.current_grade ? ` · ${c.current_grade}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
      {(data.strongest || data.needs) && (
        <div className="relative mt-3 flex flex-wrap gap-2 text-[11px]">
          {data.strongest && (<span className="rounded-full px-2.5 py-1 font-semibold border" style={{ borderColor: "hsl(140 70% 45%)", color: "hsl(140 70% 45%)", background: "hsl(140 70% 45% / 0.1)" }}><Star className="inline h-3 w-3 mr-1" /> Strongest: {data.strongest}</span>)}
          {data.needs && (<span className="rounded-full px-2.5 py-1 font-semibold border" style={{ borderColor: "hsl(38 90% 55%)", color: "hsl(38 90% 55%)", background: "hsl(38 90% 55% / 0.1)" }}>⚠️ Improve: {data.needs}</span>)}
        </div>
      )}
      {data.goals && data.goals.length > 0 && (
        <div className="relative mt-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Goals</div>
          <div className="flex flex-wrap gap-1.5">
            {data.goals.map((g) => (<span key={g} className="rounded-full px-2.5 py-1 text-[11px] font-medium border border-border bg-card">🎯 {g}</span>))}
          </div>
        </div>
      )}
    </div>
  );
});
AcademicCard.displayName = "AcademicCard";
