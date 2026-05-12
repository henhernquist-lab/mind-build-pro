import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSubjects } from "@/lib/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotebookPen, Plus, Sparkles, Trash2, Save, Wand2, Brain, Headphones, Download } from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";
import { useRank } from "@/lib/ranks2";

type Note = {
  id: string;
  subject: string;
  title: string;
  content: string;
  ai_summary: string | null;
  updated_at: string;
};

export default function Notes() {
  const { user } = useAuth();
  const subjects = useSubjects();
  const academic = useRank("academic");
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState<"summary" | "flashcards" | "quiz" | null>(null);
  const [aiResult, setAiResult] = useState<string>("");
  const [podcastBusy, setPodcastBusy] = useState(false);
  const [podcastUrl, setPodcastUrl] = useState<string>("");
  const [podcastTitle, setPodcastTitle] = useState<string>("");

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("study_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setNotes(((data as any) ?? []) as Note[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const active = notes.find((n) => n.id === activeId);

  const filtered = notes.filter((n) => filter === "all" || n.subject === filter);

  const create = async () => {
    if (!user) return;
    const subject = filter !== "all" ? filter : (subjects[0]?.label ?? "General");
    const { data, error } = await supabase
      .from("study_notes")
      .insert({ user_id: user.id, subject, title: "Untitled note", content: "" })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    sfx.click();
    try {
      const { unlockBadge } = await import("@/lib/achievements");
      const { incrementChallengeProgress } = await import("@/lib/dailyChallenges");
      await unlockBadge(user.id, "note_taker");
      await incrementChallengeProgress(user.id, "save_note", 1);
    } catch {}
    setActiveId((data as any).id);
    reload();
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    await supabase
      .from("study_notes")
      .update({ title: active.title, content: active.content, subject: active.subject })
      .eq("id", active.id);
    sfx.click();
    setSaving(false);
    toast.success("Saved");
    reload();
  };

  const remove = async (id: string) => {
    await supabase.from("study_notes").delete().eq("id", id);
    if (activeId === id) setActiveId(null);
    reload();
    toast("Note deleted");
  };

  const updateActive = (patch: Partial<Note>) => {
    if (!active) return;
    setNotes((ns) => ns.map((n) => (n.id === active.id ? { ...n, ...patch } : n)));
  };

  const runAI = async (mode: "summary" | "flashcards" | "quiz") => {
    if (!active || !active.content.trim()) {
      toast.error("Write some notes first");
      return;
    }
    setAiBusy(mode);
    setAiResult("");
    try {
      const prompts = {
        summary: `Summarize these ${active.subject} notes into a tight 5-bullet study summary. Return JSON: { "out": "<markdown bullets>" }`,
        flashcards: `Turn these ${active.subject} notes into 6 flashcards. Return JSON: { "out": "<each line: 'Q: ... — A: ...'>" }`,
        quiz: `Generate a 5-question short-answer quiz from these ${active.subject} notes with answers. Return JSON: { "out": "<numbered Q&A>" }`,
      };
      const { data, error } = await supabase.functions.invoke("game-questions", {
        body: {
          mode: "custom_json",
          system: "You are a study assistant. Output strict JSON only.",
          prompt: `${prompts[mode]}\n\nNotes:\n${active.content.slice(0, 4000)}`,
        },
      });
      if (error) throw error;
      const out = (data as any)?.out ?? "";
      setAiResult(out);
      if (mode === "summary") {
        await supabase.from("study_notes").update({ ai_summary: out }).eq("id", active.id);
        updateActive({ ai_summary: out });
      }
      sfx.xp();
      await academic.addXp(2);
    } catch (e: any) {
      toast.error(e.message || "AI failed");
    } finally {
      setAiBusy(null);
    }
  };

  const generatePodcast = async () => {
    if (!active || !active.content.trim()) {
      toast.error("Write some notes first");
      return;
    }
    setPodcastBusy(true);
    if (podcastUrl) {
      URL.revokeObjectURL(podcastUrl);
      setPodcastUrl("");
    }
    try {
      const { data, error } = await supabase.functions.invoke("podcast-generate", {
        body: { text: active.content, title: active.title || "Study Note" },
      });
      if (error) throw error;
      const audioBase64 = (data as any)?.audioBase64;
      if (!audioBase64) throw new Error("No audio returned");
      const url = `data:audio/mpeg;base64,${audioBase64}`;
      setPodcastUrl(url);
      setPodcastTitle(active.title || "Study Note");
      sfx.xp();
      await academic.addXp(3);
      toast.success("Podcast ready");
    } catch (e: any) {
      toast.error(e.message || "Podcast generation failed");
    } finally {
      setPodcastBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <NotebookPen className="h-7 w-7 text-primary" /> Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Type notes per subject. AI can summarize or quiz you.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.label}>{s.emoji} {s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={create} className="press"><Plus className="h-4 w-4 mr-1" /> New</Button>
        </div>
      </header>

      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <aside className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto">
          {loading ? (
            <div className="text-muted-foreground text-sm p-3">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground text-sm p-3">No notes yet.</div>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                onClick={() => { setActiveId(n.id); setAiResult(""); }}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  activeId === n.id ? "border-primary bg-primary/10" : "border-border bg-card/50 hover:border-primary/40"
                }`}
              >
                <div className="font-semibold text-sm truncate">{n.title || "Untitled"}</div>
                <div className="text-[10px] uppercase tracking-normalr text-muted-foreground mt-1">
                  {n.subject} • {new Date(n.updated_at).toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{n.content || "(empty)"}</div>
              </button>
            ))
          )}
        </aside>

        <main>
          {active ? (
            <Card className="p-4 glass space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  value={active.title}
                  onChange={(e) => updateActive({ title: e.target.value })}
                  className="text-lg font-semibold flex-1 min-w-[200px]"
                />
                <Select value={active.subject} onValueChange={(v) => updateActive({ subject: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.label}>{s.emoji} {s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={save} disabled={saving} variant="outline" size="sm" className="press">
                  <Save className="h-4 w-4 mr-1" /> {saving ? "..." : "Save"}
                </Button>
                <Button onClick={() => remove(active.id)} variant="ghost" size="sm" aria-label="Delete note">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Textarea
                value={active.content}
                onChange={(e) => updateActive({ content: e.target.value })}
                placeholder="Take notes here. Auto-save with the Save button."
                rows={16}
                className="font-mono text-sm"
              />
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => runAI("summary")} disabled={aiBusy !== null} variant="outline" className="press">
                  <Sparkles className="h-4 w-4 mr-1" /> {aiBusy === "summary" ? "..." : "Summarize"}
                </Button>
                <Button onClick={() => runAI("flashcards")} disabled={aiBusy !== null} variant="outline" className="press">
                  <Wand2 className="h-4 w-4 mr-1" /> {aiBusy === "flashcards" ? "..." : "Flashcards"}
                </Button>
                <Button onClick={() => runAI("quiz")} disabled={aiBusy !== null} variant="outline" className="press">
                  <Brain className="h-4 w-4 mr-1" /> {aiBusy === "quiz" ? "..." : "Quiz Me"}
                </Button>
                <Button onClick={generatePodcast} disabled={podcastBusy} variant="outline" className="press">
                  <Headphones className="h-4 w-4 mr-1" /> {podcastBusy ? "Generating..." : "Generate Podcast"}
                </Button>
              </div>
              {podcastUrl && (
                <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs uppercase tracking-normalr text-muted-foreground flex items-center gap-1">
                      <Headphones className="h-3 w-3" /> Podcast: {podcastTitle}
                    </div>
                    <a
                      href={podcastUrl}
                      download={`${podcastTitle.replace(/[^a-z0-9-_]+/gi, "_") || "podcast"}.mp3`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" /> Download
                    </a>
                  </div>
                  <audio controls src={podcastUrl} className="w-full" />
                </div>
              )}
              {(aiResult || active.ai_summary) && (
                <div className="p-4 rounded-lg bg-muted/40 border border-border">
                  <div className="text-xs uppercase tracking-normalr text-muted-foreground mb-2">AI Output</div>
                  <pre className="whitespace-pre-wrap font-sans text-sm">{aiResult || active.ai_summary}</pre>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-12 text-center text-muted-foreground glass">
              <NotebookPen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              Select a note or create a new one.
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
