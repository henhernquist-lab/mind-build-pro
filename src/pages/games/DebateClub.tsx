import { useEffect, useState } from "react";
import { Loader2, Mic, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSubjects } from "@/lib/subjects";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useRank } from "@/lib/ranks2";
import { callGame } from "@/lib/games/api";
import { SubjectPicker } from "@/components/games/SubjectPicker";
import { useLocalStorage } from "@/lib/storage";
import { saveChat } from "@/lib/savedChats";
import { motion } from "framer-motion";
import { toast } from "sonner";

type Turn = { role: "user" | "ai"; round: number; text: string };

const DebateClub = () => {
  const { user, profile } = useAuth();
  const subjects = useSubjects();
  const academic = useRank("academic");
  const [savedSubject, setSavedSubject] = useLocalStorage<string>("debate_subject", "langlit");
  const [phase, setPhase] = useState<"setup" | "debate" | "judging" | "result">("setup");
  const [topics, setTopics] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [position, setPosition] = useState<"for" | "against">("for");
  const [round, setRound] = useState(1);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<any>(null);

  const subject = subjects.find((s) => s.id === savedSubject) ?? subjects[0];

  const generateTopics = async () => {
    setLoading(true);
    const r = await callGame({ mode: "topic_list", subject: subject.label });
    setTopics(r.topics ?? []);
    setLoading(false);
  };

  useEffect(() => { generateTopics(); /* eslint-disable-next-line */ }, [savedSubject]);

  const start = (chosen: string) => {
    setTopic(chosen);
    setPosition(Math.random() < 0.5 ? "for" : "against");
    setTranscript([]);
    setRound(1);
    setPhase("debate");
  };

  const submit = async () => {
    if (draft.trim().split(/\s+/).length < 3) { toast.error("Write at least 3 sentences"); return; }
    const userTurn: Turn = { role: "user", round, text: draft.trim() };
    const newTranscript = [...transcript, userTurn];
    setTranscript(newTranscript);
    setDraft("");
    setLoading(true);
    const aiResp = await callGame({
      mode: "debate", topic, position: position === "for" ? "against" : "for", round,
      lastUserArgument: userTurn.text,
    });
    const aiTurn: Turn = { role: "ai", round, text: aiResp.argument ?? "..." };
    setTranscript([...newTranscript, aiTurn]);
    setLoading(false);

    if (round >= 3) {
      // Judge
      setPhase("judging");
      const transcriptText = [...newTranscript, aiTurn].map((t) => `${t.role === "user" ? profile?.display_name ?? "Student" : "AI"} (R${t.round}): ${t.text}`).join("\n\n");
      const judge = await callGame({
        mode: "judge", topic, position, transcript: transcriptText, studentName: profile?.display_name ?? "Student", bio: profile?.bio ?? "",
      });
      setVerdict(judge);
      const xp = Math.round((judge.total ?? 0) / 100 * 150);
      await academic.addXp(xp);
      // Save to chat
      if (user) {
        await saveChat(user.id, {
          subject_id: "debate",
          subject_label: `🎤 Debate: ${topic.slice(0, 40)}`,
          subject_emoji: "🎤",
          subject_color: "primary",
          title: topic.slice(0, 60),
          messages: [...newTranscript, aiTurn].map((t) => ({ role: (t.role === "user" ? "user" : "assistant") as any, content: t.text })),
        }).catch(() => {});
      }
      setPhase("result");
    } else {
      setRound(round + 1);
    }
  };

  if (phase === "setup") {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Game</p>
          <h1 className="text-3xl font-bold mt-1">🎤 Debate Club</h1>
          <p className="text-sm text-muted-foreground mt-1">Argue against the AI on a topic. 3 rounds, then a judge scores you out of 100.</p>
        </header>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <SubjectPicker subjects={subjects} value={savedSubject} onChange={setSavedSubject} />
            <Button size="sm" variant="outline" onClick={generateTopics} disabled={loading}>{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}</Button>
          </div>
          <div className="grid gap-2">
            {topics.map((t) => (<Button key={t} variant="outline" onClick={() => start(t)} className="justify-start text-left h-auto py-3 whitespace-normal">{t}</Button>))}
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Or type your own topic:</div>
            <div className="flex gap-2">
              <Input id="custom" placeholder="Custom debate topic" />
              <Button onClick={() => { const v = (document.getElementById("custom") as HTMLInputElement).value.trim(); if (v) start(v); }}>Go</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result" && verdict) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
        <div className="text-center mb-4">
          <Trophy className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-3xl font-bold mt-2">Score: {verdict.total}/100</h1>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {Object.entries(verdict.scores ?? {}).map(([k, v]: any) => (
            <div key={k} className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="text-2xl font-bold">{v}<span className="text-sm text-muted-foreground">/25</span></div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-sm mb-3">{verdict.feedback}</div>
        {verdict.strongest_sentence && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm italic">💡 Your strongest: "{verdict.strongest_sentence}"</div>
        )}
        <Button className="mt-6 w-full" onClick={() => { setPhase("setup"); setVerdict(null); }}>New debate</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="text-xs text-muted-foreground">Round {round}/3 — Arguing <b>{position.toUpperCase()}</b></div>
          <div className="font-semibold">{topic}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setPhase("setup")}>Quit</Button>
      </div>
      <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto">
        {transcript.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border p-3 text-sm ${t.role === "user" ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{t.role === "user" ? profile?.display_name ?? "You" : "AI"} • R{t.round}</div>
            {t.text}
          </motion.div>
        ))}
        {loading && <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {phase === "judging" && <div className="text-center text-xs text-muted-foreground italic">Judge is scoring…</div>}
      </div>
      {phase === "debate" && (
        <div className="space-y-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} placeholder={round === 1 ? "Opening statement (3+ sentences)…" : round === 2 ? "Rebuttal — attack their points and defend yours…" : "Closing — strongest summary…"} />
          <Button onClick={submit} disabled={loading || !draft.trim()} className="w-full"><Mic className="h-4 w-4 mr-1.5" /> Submit</Button>
        </div>
      )}
    </div>
  );
};

export default DebateClub;
