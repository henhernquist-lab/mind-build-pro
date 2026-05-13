interface Props {
  fields: { label: string; filled: boolean }[];
}

/** Donut showing what % of profile fields are filled, with checklist below. */
export const ProfileCompletionRing = ({ fields }: Props) => {
  const filled = fields.filter((f) => f.filled).length;
  const total = fields.length;
  const pct = total ? Math.round((filled / total) * 100) : 0;

  const r = 38;
  const c = 2 * Math.PI * r;
  const dash = (c * pct) / 100;

  const tone = pct >= 90 ? "hsl(var(--primary))" : pct >= 60 ? "hsl(var(--sports))" : "hsl(var(--muted-foreground))";

  return (
    <div className="rounded-2xl glass p-5 flex items-center gap-5">
      <div className="relative h-24 w-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={r}
            fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            style={{
              transition: "stroke-dasharray 700ms cubic-bezier(0.22, 1, 0.36, 1)",
              filter: `drop-shadow(0 0 6px ${tone})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-bold tabular-nums">{pct}%</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Complete</div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Profile Completion</div>
        <div className="text-sm font-semibold mb-2">{filled} / {total} fields done</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center gap-1.5 text-[11px]">
              <span className={f.filled ? "text-primary" : "text-muted-foreground/50"}>
                {f.filled ? "✓" : "○"}
              </span>
              <span className={f.filled ? "" : "text-muted-foreground"}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};