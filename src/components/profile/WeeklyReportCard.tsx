import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, TrendingUp, Target, Trophy } from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";

type Report = {
  headline: string;
  grade: string;
  wins: string[];
  struggles: string[];
  next_2_weeks: string[];
  athletic_summary: string;
  academic_summary: string;
};

const gradeColor = (g: string) => {
  if (g.startsWith("A")) return "hsl(140 70% 50%)";
  if (g.startsWith("B")) return "hsl(var(--school))";
  if (g.startsWith("C")) return "hsl(45 90% 55%)";
  return "hsl(0 80% 60%)";
};

export const WeeklyReportCard = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [stats, setStats] = useState<any>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-report", { body: {} });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      setReport((data as any).report);
      setStats((data as any).stats);
      sfx.rankUp();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 glass space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Biweekly Report Card
          </h3>
          <p className="text-xs text-muted-foreground">AI-generated from your last 14 days of activity.</p>
        </div>
        <Button onClick={generate} disabled={loading} className="press">
          <Sparkles className="h-4 w-4 mr-1" /> {loading ? "Generating..." : report ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {report ? (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-card to-muted/40 border border-border">
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center text-xl font-semibold flex-shrink-0"
              style={{
                background: `${gradeColor(report.grade)}20`,
                border: `2px solid ${gradeColor(report.grade)}`,
                color: gradeColor(report.grade),
              }}
            >
              {report.grade}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold leading-tight">{report.headline}</div>
              {stats && (
                <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                  <span>🔥 {stats.streak}d streak</span>
                  <span>💪 {stats.workouts_logged} workouts</span>
                  <span>📖 {stats.vocab_reviewed} vocab</span>
                  <span>🏆 {stats.prs?.length ?? 0} PRs</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-card/60 border border-border">
              <div className="text-xs uppercase tracking-normalr text-muted-foreground mb-1">💪 Athletic</div>
              <div className="text-sm">{report.athletic_summary}</div>
            </div>
            <div className="p-3 rounded-lg bg-card/60 border border-border">
              <div className="text-xs uppercase tracking-normalr text-muted-foreground mb-1">🎓 Academic</div>
              <div className="text-sm">{report.academic_summary}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <Section icon={Trophy} title="Wins" items={report.wins} color="hsl(140 70% 50%)" />
            <Section icon={Target} title="Work On" items={report.struggles} color="hsl(45 90% 55%)" />
            <Section icon={TrendingUp} title="Next 2 Weeks" items={report.next_2_weeks} color="hsl(var(--primary))" />
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Click <span className="font-semibold text-foreground">Generate</span> to see your AI report card.
        </div>
      )}
    </Card>
  );
};

const Section = ({ icon: Icon, title, items, color }: { icon: any; title: string; items: string[]; color: string }) => (
  <div className="p-3 rounded-lg bg-card/40 border border-border">
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <span className="text-xs uppercase tracking-normalr font-semibold" style={{ color }}>{title}</span>
    </div>
    <ul className="space-y-1.5 text-sm">
      {items?.map((it, i) => (
        <li key={i} className="flex gap-1.5">
          <span style={{ color }}>•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  </div>
);
