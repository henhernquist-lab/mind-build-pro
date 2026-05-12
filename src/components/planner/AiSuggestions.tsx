// AI-powered planner suggestions: pulls upcoming tests + current blocks for the
// selected date, asks the AI for 3 study/workout block suggestions, lets the
// user add them with one tap.
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { addBlock, Block } from "@/lib/planner";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";

type Suggestion = {
  start_time: string;
  end_time: string;
  label: string;
  category: "school" | "sports" | "free";
  reason: string;
};

type Props = {
  dateKey: string;
  busyTimes: Array<{ start: string; end: string; label: string }>;
  onAdded: () => void;
};

export const AiSuggestions = ({ dateKey, busyTimes, onAdded }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [adding, setAdding] = useState<number | null>(null);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    setSuggestions([]);
    try {
      // Pull context: upcoming tests, weakest subject, classes
      const sinceDate = dateKey;
      const sevenAhead = new Date(new Date(dateKey).getTime() + 7 * 86400000).toISOString().slice(0, 10);
      const [tests, profile, streak] = await Promise.all([
        supabase.from("academic_tests").select("title, subject, test_date, difficulty").eq("user_id", user.id).eq("completed", false).gte("test_date", sinceDate).lte("test_date", sevenAhead).order("test_date"),
        supabase.from("academic_profile").select("needs_improvement, strongest_subject").eq("user_id", user.id).maybeSingle(),
        supabase.from("study_streak").select("current_streak").eq("user_id", user.id).maybeSingle(),
      ]);

      const ctx = {
        date: dateKey,
        day_of_week: new Date(dateKey).toLocaleDateString(undefined, { weekday: "long" }),
        existing_blocks: busyTimes,
        upcoming_tests: tests.data ?? [],
        needs_improvement: profile.data?.needs_improvement,
        streak: streak.data?.current_streak ?? 0,
      };

      const { data, error } = await supabase.functions.invoke("game-questions", {
        body: {
          mode: "custom_json",
          system: "You are a high school study coach. Output strict JSON only.",
          prompt: `Suggest 3 specific 30-60 min planner blocks for this student's day. Avoid overlapping with existing blocks. Times must be 24h HH:MM. Categories: 'school' (study), 'sports' (workout), 'free' (rest/hobby). Prioritize upcoming tests and weak subjects.\n\nContext:\n${JSON.stringify(ctx, null, 2)}\n\nReturn JSON: { "suggestions": [{ "start_time": "HH:MM", "end_time": "HH:MM", "label": "<short>", "category": "school|sports|free", "reason": "<one sentence why>" }] }`,
        },
      });
      if (error) throw error;
      const out = ((data as any)?.suggestions ?? []) as Suggestion[];
      setSuggestions(out.slice(0, 3));
      sfx.click();
    } catch (e: any) {
      toast.error(e.message || "Failed to suggest");
    } finally {
      setLoading(false);
    }
  };

  const accept = async (i: number) => {
    if (!user) return;
    const s = suggestions[i];
    setAdding(i);
    try {
      const block: Block = {
        id: "",
        date: dateKey,
        startTime: s.start_time,
        endTime: s.end_time,
        label: s.label,
        category: s.category,
      };
      await addBlock(user.id, block);
      sfx.correct();
      toast.success(`Added: ${s.label}`);
      setSuggestions((sl) => sl.filter((_, idx) => idx !== i));
      onAdded();
    } catch (e: any) {
      toast.error(e.message || "Failed to add");
    } finally {
      setAdding(null);
    }
  };

  return (
    <Card className="p-4 mb-6 glass border-primary/30">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/40 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI Planner</div>
            <div className="text-xs text-muted-foreground">Smart block suggestions for this day</div>
          </div>
        </div>
        <Button size="sm" onClick={generate} disabled={loading} className="press">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Suggest</>}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg bg-card/60 border border-border hover:border-primary/40 transition-colors"
              style={{
                borderLeft: `3px solid ${s.category === "sports" ? "hsl(var(--sports))" : s.category === "free" ? "hsl(var(--free))" : "hsl(var(--school))"}`,
              }}
            >
              <div className="text-xs font-mono tabular-nums text-muted-foreground w-24 flex-shrink-0 pt-0.5">
                {s.start_time}<br />{s.end_time}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.reason}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => accept(i)} disabled={adding === i} className="press">
                {adding === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
