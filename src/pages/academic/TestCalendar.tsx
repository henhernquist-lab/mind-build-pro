import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSubjects } from "@/lib/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CalendarDays, Plus, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";

type TestRow = {
  id: string;
  subject: string;
  title: string;
  test_date: string;
  topics: string | null;
  notes: string | null;
  difficulty: string;
  completed: boolean;
  score: number | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysUntil = (date: string) => {
  const d = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  return d;
};

const urgencyColor = (days: number) => {
  if (days < 0) return "border-muted text-muted-foreground";
  if (days === 0) return "border-red-500/60 bg-red-500/10 text-red-300";
  if (days <= 2) return "border-orange-500/60 bg-orange-500/10 text-orange-300";
  if (days <= 7) return "border-yellow-500/40 bg-yellow-500/5 text-yellow-300";
  return "border-border";
};

export default function TestCalendar() {
  const { user } = useAuth();
  const subjects = useSubjects();
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [planning, setPlanning] = useState<string | null>(null);
  const [plan, setPlan] = useState<Record<string, string>>({});

  const [draft, setDraft] = useState({
    subject: "",
    title: "",
    test_date: todayISO(),
    topics: "",
    difficulty: "medium",
  });

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("academic_tests")
      .select("*")
      .eq("user_id", user.id)
      .order("test_date", { ascending: true });
    setTests((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, [user]);

  const addTest = async () => {
    if (!user || !draft.title || !draft.subject) {
      toast.error("Subject and title required");
      return;
    }
    const { error } = await supabase.from("academic_tests").insert({
      user_id: user.id,
      ...draft,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    sfx.click();
    toast.success("Test added");
    try {
      const { unlockBadge } = await import("@/lib/achievements");
      await unlockBadge(user.id, "test_logged");
    } catch {}
    setAdding(false);
    setDraft({ subject: "", title: "", test_date: todayISO(), topics: "", difficulty: "medium" });
    reload();
  };

  const toggleDone = async (t: TestRow) => {
    await supabase
      .from("academic_tests")
      .update({ completed: !t.completed })
      .eq("id", t.id);
    if (!t.completed) sfx.correct();
    reload();
  };

  const remove = async (id: string) => {
    await supabase.from("academic_tests").delete().eq("id", id);
    reload();
    toast("Test removed");
  };

  const generatePlan = async (t: TestRow) => {
    setPlanning(t.id);
    try {
      const days = Math.max(1, daysUntil(t.test_date));
      const { data, error } = await supabase.functions.invoke("game-questions", {
        body: {
          mode: "custom_json",
          system: "You are a study coach. Output strict JSON only.",
          prompt: `Make a ${Math.min(days, 7)}-day study plan for a ${t.difficulty} difficulty test in "${t.subject}" titled "${t.title}". Topics to cover: ${t.topics || "general material"}. Return JSON: { "plan": "<markdown plan with day-by-day bullet points, max 8 lines>" }`,
        },
      });
      if (error) throw error;
      setPlan((p) => ({ ...p, [t.id]: (data as any)?.plan ?? "" }));
      sfx.xp();
    } catch (e: any) {
      toast.error(e.message || "Plan failed");
    } finally {
      setPlanning(null);
    }
  };

  const upcoming = tests.filter((t) => !t.completed);
  const done = tests.filter((t) => t.completed);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" /> Test Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track upcoming tests, get auto-generated study plans.
          </p>
        </div>
        <Button onClick={() => setAdding((v) => !v)} className="press">
          <Plus className="h-4 w-4 mr-1" /> Add Test
        </Button>
      </header>

      {adding && (
        <Card className="p-4 space-y-3 glass">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase text-muted-foreground">Subject</label>
              <Select value={draft.subject} onValueChange={(v) => setDraft({ ...draft, subject: v })}>
                <SelectTrigger><SelectValue placeholder="Pick subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.label}>{s.emoji} {s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase text-muted-foreground">Title</label>
              <Input
                placeholder="Unit 4 exam"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-muted-foreground">Date</label>
              <Input
                type="date"
                value={draft.test_date}
                onChange={(e) => setDraft({ ...draft, test_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-muted-foreground">Difficulty</label>
              <Select value={draft.difficulty} onValueChange={(v) => setDraft({ ...draft, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase text-muted-foreground">Topics</label>
            <Textarea
              placeholder="Quadratic equations, factoring, word problems..."
              value={draft.topics}
              onChange={(e) => setDraft({ ...draft, topics: e.target.value })}
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={addTest}>Save</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <>
          <section>
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">No upcoming tests. Stay sharp.</Card>
            ) : (
              <div className="space-y-2">
                {upcoming.map((t) => {
                  const days = daysUntil(t.test_date);
                  return (
                    <Card key={t.id} className={`p-4 border-l-4 ${urgencyColor(days)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">{t.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{t.subject}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{t.difficulty}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {new Date(t.test_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                            {" • "}
                            <span className={days <= 2 ? "font-bold text-foreground" : ""}>
                              {days < 0 ? `${-days}d ago` : days === 0 ? "TODAY" : `in ${days}d`}
                            </span>
                          </div>
                          {t.topics && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.topics}</div>}
                          {plan[t.id] && (
                            <pre className="mt-3 p-3 bg-muted/30 rounded text-xs whitespace-pre-wrap font-sans">{plan[t.id]}</pre>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="ghost" onClick={() => generatePlan(t)} disabled={planning === t.id} title="AI study plan">
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toggleDone(t)} title="Mark done">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(t.id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {done.length > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                Completed ({done.length})
              </h2>
              <div className="space-y-2">
                {done.map((t) => (
                  <Card key={t.id} className="p-3 opacity-60">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium line-through">{t.title}</span>
                        <span className="text-xs text-muted-foreground ml-2">{t.subject}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => toggleDone(t)}>Undo</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
