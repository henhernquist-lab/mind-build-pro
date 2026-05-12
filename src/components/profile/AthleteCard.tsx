import { forwardRef } from "react";
import { Trophy, MapPin, GraduationCap } from "lucide-react";
import { getRank } from "@/lib/rank";
import { initialsFromName } from "@/lib/profile";

export type AthleteCardData = {
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
  grade?: string | null;
  schoolName?: string | null;
  bio?: string | null;
  age?: number | null;
  heightFt?: number | null;
  heightIn?: number | null;
  weightLbs?: number | null;
  primarySports?: string[] | null;
  otherSport?: string | null;
  positionEvent?: string | null;
  yearsExperience?: string | null;
  fitnessGoals?: string[] | null;
  totalXp?: number;
};

const formatHeight = (ft?: number | null, inch?: number | null) => {
  if (ft == null && inch == null) return null;
  return `${ft ?? 0}'${inch ?? 0}"`;
};

export const AthleteCard = forwardRef<HTMLDivElement, { data: AthleteCardData; compact?: boolean }>(
  ({ data, compact }, ref) => {
    const sports = [
      ...(data.primarySports ?? []).filter((s) => s !== "Other"),
      ...(data.otherSport ? [data.otherSport] : []),
    ];
    const rank = getRank(data.totalXp ?? 0);
    const height = formatHeight(data.heightFt, data.heightIn);
    const initials = initialsFromName(data.displayName);

    return (
      <div
        ref={ref}
        className="relative overflow-hidden rounded-3xl border-2 p-6 md:p-7 text-foreground holo-sheen lift"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--card) / 0.7), hsl(var(--background) / 0.85))",
          borderColor: rank.color,
          boxShadow: `0 0 50px -10px ${rank.color}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
        }}
      >
        {/* Glow */}
        <div
          aria-hidden
          className="absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: rank.color }}
        />
        <div
          aria-hidden
          className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: "hsl(var(--primary))" }}
        />

        <div className="relative flex items-start gap-4 md:gap-5">
          {/* Avatar */}
          <div
            className="h-20 w-20 md:h-24 md:w-24 rounded-2xl flex items-center justify-center text-xl md:text-xl font-semibold flex-shrink-0 overflow-hidden border-2"
            style={{
              background: data.avatarUrl ? "transparent" : "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              borderColor: rank.color,
              boxShadow: `0 0 24px -4px ${rank.color}, inset 0 0 16px rgba(255,255,255,0.06)`,
            }}
          >
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt={data.displayName} className="h-full w-full object-cover" crossOrigin="anonymous" />
            ) : (
              initials
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-normal text-muted-foreground">Athlete</div>
                <h2 className="text-xl md:text-xl font-semibold leading-tight truncate">
                  {data.displayName || "Anonymous"}
                </h2>
                {data.username && (
                  <div className="text-xs text-muted-foreground">@{data.username}</div>
                )}
              </div>
              <div
                className="flex-shrink-0 rounded-xl px-2.5 py-1.5 text-center"
                style={{ background: `${rank.color}22`, border: `1px solid ${rank.color}55` }}
              >
                <div className="text-xl leading-none">{rank.icon}</div>
                <div
                  className="text-[10px] font-semibold mt-0.5 uppercase tracking-normal"
                  style={{ color: rank.color }}
                >
                  {rank.name}
                </div>
              </div>
            </div>

            {/* Meta row */}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {data.grade && (
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" /> {data.grade} grade
                </span>
              )}
              {data.schoolName && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {data.schoolName}
                </span>
              )}
              {(data.totalXp ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Trophy className="h-3 w-3" /> {data.totalXp} XP
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="Height" value={height ?? "—"} />
          <Stat label="Weight" value={data.weightLbs ? `${data.weightLbs} lb` : "—"} />
          <Stat label="Age" value={data.age ? String(data.age) : "—"} />
        </div>

        {/* Sport / position */}
        {(sports.length > 0 || data.positionEvent) && (
          <div className="relative mt-4">
            <div className="text-[10px] uppercase tracking-normalst text-muted-foreground mb-1.5">Sport</div>
            <div className="flex flex-wrap gap-1.5">
              {sports.map((s) => (
                <span
                  key={s}
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    background: "hsl(var(--sports) / 0.18)",
                    color: "hsl(var(--sports))",
                    border: "1px solid hsl(var(--sports) / 0.35)",
                  }}
                >
                  {s}
                </span>
              ))}
              {data.positionEvent && (
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    background: "hsl(var(--primary) / 0.15)",
                    color: "hsl(var(--primary))",
                    border: "1px solid hsl(var(--primary) / 0.35)",
                  }}
                >
                  {data.positionEvent}
                </span>
              )}
              {data.yearsExperience && (
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold border border-border text-muted-foreground">
                  {data.yearsExperience}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Goals */}
        {data.fitnessGoals && data.fitnessGoals.length > 0 && (
          <div className="relative mt-4">
            <div className="text-[10px] uppercase tracking-normalst text-muted-foreground mb-1.5">Goals</div>
            <div className="flex flex-wrap gap-1.5">
              {data.fitnessGoals.map((g) => (
                <span
                  key={g}
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium border border-border bg-card"
                >
                  🎯 {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {data.bio && !compact && (
          <p className="relative mt-4 text-sm text-muted-foreground italic border-l-2 pl-3" style={{ borderColor: rank.color }}>
            "{data.bio}"
          </p>
        )}
      </div>
    );
  },
);
AthleteCard.displayName = "AthleteCard";

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-card/60 py-2">
    <div className="text-base md:text-lg font-semibold tabular-nums">{value}</div>
    <div className="text-[9px] uppercase tracking-normalst text-muted-foreground">{label}</div>
  </div>
);