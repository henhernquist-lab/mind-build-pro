import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { BookText, Plus, Sparkles, Brain, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";
import { SAT_VOCAB_SEED } from "@/lib/vocabSeed";
import { useRank } from "@/lib/ranks2";

type VocabRow = {
  id: string;
  word: string;
  definition: string;
  example: string | null;
  ease: number;
  interval_days: number;
  reps: number;
  due_at: string;
  mastered: boolean;
};

// SM-2-lite scheduler
const schedule = (row: VocabRow, quality: 0 | 1 | 2 | 3): { ease: number; interval_days: number; reps: number; due_at: string; mastered: boolean } => {
  let { ease, interval_days, reps } = row;
  // quality: 0=again, 1=hard, 2=good, 3=easy
  if (quality === 0) {
    reps = 0;
    interval_days = 1;
  } else {
    reps += 1;
    if (reps === 1) interval_days = 1;
    else if (reps === 2) interval_days = 3;
    else interval_days = Math.round(interval_days * ease);
    ease = Math.max(1.3, ease + (quality === 3 ? 0.15 : quality === 1 ? -0.2 : 0));
    if (quality === 3) interval_days = Math.round(interval_days * 1.3);
  }
  const due_at = new Date(Date.now() + interval_days * 86400000).toISOString();
  const mastered = reps >= 5 && interval_days >= 21;
  return { ease, interval_days, reps, due_at, mastered };
};

export default function VocabBuilder() {
  const { user } = useAuth();
  const academic = useRank("academic");
  const [all, setAll] = useState<VocabRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showing, setShowing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ word: "", definition: "", example: "" });
  const [revealed, setRevealed] = useState(false);
  const [generating, setGenerating] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("vocab_words")
      .select("*")
      .eq("user_id", user.id)
      .order("due_at", { ascending: true });
    let rows = ((data as any) ?? []) as VocabRow[];
    if (rows.length === 0) {
      // seed
      const insert = SAT_VOCAB_SEED.map((s) => ({ user_id: user.id, ...s, deck: "sat" }));
      await supabase.from("vocab_words").insert(insert);
      const { data: d2 } = await supabase
        .from("vocab_words")
        .select("*")
        .eq("user_id", user.id)
        .order("due_at", { ascending: true });
      rows = ((d2 as any) ?? []) as VocabRow[];
      toast.success(`Loaded ${SAT_VOCAB_SEED.length} SAT words to start`);
    }
    setAll(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const now = Date.now();
  const due = all.filter((r) => !r.mastered && new Date(r.due_at).getTime() <= now);
  const mastered = all.filter((r) => r.mastered);
  const current = due[0];

  const grade = async (q: 0 | 1 | 2 | 3) => {
    if (!current || !user) return;
    const next = schedule(current, q);
    await supabase.from("vocab_words").update({ ...next, last_reviewed_at: new Date().toISOString() }).eq("id", current.id);
    if (q >= 2) {
      sfx.correct();
      await academic.addXp(q === 3 ? 4 : 2);
    } else {
      sfx.wrong();
    }
    if (next.mastered) {
      sfx.rankUp();
      toast.success(`✨ Mastered: ${current.word}`);
    }
    setRevealed(false);
    reload();
  };

  const addCard = async () => {
    if (!user || !draft.word || !draft.definition) {
      toast.error("Word and definition required");
      return;
    }
    await supabase.from("vocab_words").insert({ user_id: user.id, ...draft, deck: "custom" });
    sfx.click();
    setDraft({ word: "", definition: "", example: "" });
    setAdding(false);
    reload();
  };

  const remove = async (id: string) => {
    await supabase.from("vocab_words").delete().eq("id", id);
    reload();
  };

  const generateAI = async () => {
    setGenerating(true);
    try {
      const existing = all.map((r) => r.word).slice(0, 30);
      const { data, error } = await supabase.functions.invoke("game-questions", {
        body: {
          mode: "custom_json",
          system: "You generate SAT vocab flashcards. Output strict JSON only.",
          prompt: `Generate 10 high-yield SAT vocab words NOT in this list: ${JSON.stringify(existing)}.\nReturn JSON: { "cards": [{ "word": "...", "definition": "<concise>", "example": "<one short sentence>" }] }`,
        },
      });
      if (error) throw error;
      const cards = (data as any)?.cards ?? [];
      if (cards.length && user) {
        await supabase.from("vocab_words").insert(
          cards.map((c: any) => ({ user_id: user.id, word: c.word, definition: c.definition, example: c.example, deck: "ai" }))
        );
        toast.success(`Added ${cards.length} new words`);
        reload();
      }
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <BookText className="h-7 w-7 text-primary" /> Vocab Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            SAT vocab with spaced repetition. {due.length} due • {mastered.length} mastered • {all.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateAI} disabled={generating} className="press">
            <Sparkles className="h-4 w-4 mr-1" /> {generating ? "..." : "AI Add 10"}
          </Button>
          <Button onClick={() => setAdding((v) => !v)} className="press">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </header>

      {adding && (
        <Card className="p-4 space-y-3 glass">
          <Input placeholder="Word" value={draft.word} onChange={(e) => setDraft({ ...draft, word: e.target.value })} />
          <Textarea placeholder="Definition" value={draft.definition} onChange={(e) => setDraft({ ...draft, definition: e.target.value })} rows={2} />
          <Input placeholder="Example sentence (optional)" value={draft.example} onChange={(e) => setDraft({ ...draft, example: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={addCard}>Save</Button>
          </div>
        </Card>
      )}

      {!showing ? (
        <Card className="p-8 text-center glass">
          <Brain className="h-12 w-12 mx-auto text-primary mb-3" />
          <div className="text-2xl font-bold gradient-text">{due.length} cards due</div>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Each correct answer earns +2 academic XP. Easy = +4 XP.
          </p>
          <Button size="lg" disabled={due.length === 0} onClick={() => setShowing(true)} className="press">
            Start Review
          </Button>
        </Card>
      ) : current ? (
        <Card className="p-8 glass-strong">
          <div className="text-center space-y-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Card {due.length} due • Reps: {current.reps} • Ease: {current.ease.toFixed(2)}
            </div>
            <div className="text-4xl md:text-5xl font-black gradient-text py-6">{current.word}</div>
            {revealed ? (
              <div className="space-y-3 text-left max-w-xl mx-auto">
                <div className="p-4 rounded-lg bg-muted/40">
                  <div className="text-xs uppercase text-muted-foreground mb-1">Definition</div>
                  <div className="text-base">{current.definition}</div>
                </div>
                {current.example && (
                  <div className="p-4 rounded-lg bg-muted/20">
                    <div className="text-xs uppercase text-muted-foreground mb-1">Example</div>
                    <div className="italic text-sm">{current.example}</div>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2 pt-3">
                  <Button variant="destructive" onClick={() => grade(0)} className="press">Again</Button>
                  <Button variant="outline" onClick={() => grade(1)} className="press">Hard</Button>
                  <Button onClick={() => grade(2)} className="press">Good</Button>
                  <Button onClick={() => grade(3)} className="bg-emerald-600 hover:bg-emerald-700 press">Easy</Button>
                </div>
              </div>
            ) : (
              <Button size="lg" onClick={() => setRevealed(true)} className="press">Reveal</Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Trophy className="h-10 w-10 mx-auto text-yellow-400 mb-2" />
          <div className="font-bold">All caught up!</div>
          <div className="text-sm text-muted-foreground">Come back later or add more words.</div>
          <Button onClick={() => setShowing(false)} className="mt-3" variant="outline">Done</Button>
        </Card>
      )}

      {loading ? null : (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">All words ({all.length})</summary>
          <div className="mt-3 grid md:grid-cols-2 gap-2">
            {all.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-2 p-2 rounded bg-card/50 border border-border">
                <div className="min-w-0">
                  <span className="font-bold">{r.word}</span>
                  {r.mastered && <span className="ml-2 text-[10px] uppercase text-yellow-400">Mastered</span>}
                  <div className="text-xs text-muted-foreground line-clamp-1">{r.definition}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
