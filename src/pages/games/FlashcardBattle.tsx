import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSubjects, type Subject } from "@/lib/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRank, ATHLETIC_RANKS, getRank } from "@/lib/ranks2";
import { fetchUserStats } from "@/lib/workouts";
import { callGame } from "@/lib/games/api";
import { SubjectPicker } from "@/components/games/SubjectPicker";
import { useLocalStorage } from "@/lib/storage";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const OPPONENTS = [
  { rank: "Recruit", name: "Rookie Bot", emoji: "🤖", accuracy: 0.4, taunt: "I'm just learning, go easy on me 😅" },
  { rank: "Varsity", name: "Study Buddy", emoji: "📚", accuracy: 0.6, taunt: "Let's grind together!" },
  { rank: "All-Star", name: "The Grinder", emoji: "🎯", accuracy: 0.75, taunt: "Lock in. No mercy." },
  { rank: "Elite", name: "Professor AI", emoji: "🎓", accuracy: 0.88, taunt: "Try to keep up." },
  { rank: "Legend", name: "Omniscient", emoji: "🧠", accuracy: 0.95, taunt: "You will lose. It's already decided." },
];

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");

const FlashcardBattle = () => {
  const { user, profile } = useAuth();
  const subjects = useSubjects();
  const academic = useRank("academic");
  const [savedSubject, setSavedSubject] = useLocalStorage<string>("fcb_subject", "algebra");
  const [athleticRankName, setAthleticRankName] = useState("Recruit");
  const [phase, setPhase] = useState<"select" | "battle" | "done">("select");
  const [round, setRound] = useState(0);
  const [scoreP, setScoreP] = useState(0);
  const [scoreA, setScoreA] = useState(0);
  const [streak, setStreak] = useState(0);
  const [q, setQ] = useState<any>(null);
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState<{ player: boolean; ai: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiTaunt, setAiTaunt] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const s = await fetchUserStats(user.id);
      setAthleticRankName(getRank(s.xp, ATHLETIC_RANKS).name);
    })();
  }, [user?.id]);

  const opponent = OPPONENTS.find((o) => o.rank === athleticRankName) ?? OPPONENTS[0];
  const opponentRankIndex = OPPONENTS.findIndex((o) => o.rank === athleticRankName);
  const myRankIndex = OPPONENTS.findIndex((o) => o.rank === academic.rank.name) ?? 0;

  const subject = subjects.find((s) => s.id === savedSubject) ?? subjects[0];

  const start = async () => {
    setPhase("battle");
    setRound(0); setScoreP(0); setScoreA(0); setStreak(0);
    setAiTaunt(opponent.taunt);
    await nextRound([]);
  };

  const nextRound = async (asked: string[]) => {
    setLoading(true); setRevealed(null); setText("");
    const next = await callGame({ mode: "question", subject: subject.label, academicRank: academic.rank.name, avoid: asked });
    setQ(next);
    setLoading(false);
  };

  const submit = async () => {
    if (!q || revealed) return;
    const playerRight = norm(text) === norm(q.answer) || (text && norm(q.answer).includes(norm(text)));
    const aiResp = await callGame({ mode: "ai_answer", accuracy: opponent.accuracy });
    const aiRight = aiResp.got_it;
    setRevealed({ player: !!playerRight, ai: !!aiRight });
    let nextStreak = streak;
    if (playerRight && !aiRight) { setScoreP((p) => p + 1); nextStreak += 1; await academic.addXp(10); }
    else if (!playerRight && aiRight) { setScoreA((p) => p + 1); nextStreak = 0; }
    else if (playerRight && aiRight) { setScoreP((p) => p + 1); setScoreA((p) => p + 1); nextStreak += 1; await academic.addXp(10); }
    else { nextStreak = 0; }
    setStreak(nextStreak);

    setTimeout(async () => {
      const newRound = round + 1;
      setRound(newRound);
      if (newRound >= 10) {
        // End
        let bonus = 0;
        if (scoreP > scoreA) {
          bonus = 75;
          if (opponentRankIndex - myRankIndex >= 2) bonus += 25;
          await academic.addXp(bonus);
          toast.success(`🏆 You won! +${bonus} XP`);
        } else {
          toast.error("You lost — every round won earned +5 XP though");
        }
        setPhase("done");
        return;
      }
      await nextRound([q.question]);
    }, 1800);
  };

  if (phase === "select") {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Game</p>
          <h1 className="text-3xl font-bold mt-1">🃏 Flashcard Battle</h1>
          <p className="text-sm text-muted-foreground mt-1">Head-to-head against an AI opponent. The stronger your athletic rank, the harder the AI.</p>
        </header>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <SubjectPicker subjects={subjects} value={savedSubject} onChange={setSavedSubject} />
          <div className="rounded-xl border border-border bg-background/50 p-4 text-center">
            <div className="text-3xl">{opponent.emoji}</div>
            <div className="font-bold mt-1">{opponent.name}</div>
            <div className="text-xs text-muted-foreground">Athletic rank: {athleticRankName}</div>
            <div className="text-xs text-muted-foreground mt-1 italic">"{opponent.taunt}"</div>
          </div>
          <Button onClick={start} className="w-full" size="lg"><Zap className="h-4 w-4 mr-1.5" /> Start 10-round battle</Button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const win = scoreP > scoreA;
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24 text-center">
        <div className="text-5xl mb-3">{win ? "🏆" : "💀"}</div>
        <h1 className="text-3xl font-bold">{win ? "Victory!" : "Defeat"}</h1>
        <p className="mt-2 text-muted-foreground">Final: You {scoreP} — AI {scoreA}</p>
        <Button className="mt-6" onClick={() => setPhase("select")}>Play again</Button>
      </div>
    );
  }

  // battle
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm">Round <b>{round + 1}/10</b></div>
        {streak >= 2 && <div className="text-orange-500 font-bold animate-pulse text-sm">🔥 x{streak}</div>}
        <Button variant="ghost" size="sm" onClick={() => setPhase("select")}>Quit</Button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground">{profile?.display_name ?? "You"}</div>
          <div className="text-3xl font-bold">{scoreP}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground">{opponent.name}</div>
          <div className="text-3xl font-bold">{scoreA}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        {loading || !q ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">{q.question}</p>
            {q.choices && (
              <div className="grid gap-2">
                {q.choices.map((c: string) => (
                  <button key={c} onClick={() => setText(c)} disabled={!!revealed} className={cn("rounded-lg border px-3 py-2 text-left text-sm",
                    revealed && norm(c) === norm(q.answer) && "border-green-500 bg-green-500/10",
                    !revealed && text === c && "border-primary bg-primary/10",
                    !revealed && text !== c && "border-border hover:bg-accent")}>{c}</button>
                ))}
              </div>
            )}
            {!q.choices && <Input value={text} onChange={(e) => setText(e.target.value)} disabled={!!revealed} onKeyDown={(e) => e.key === "Enter" && submit()} />}
            {!revealed && <Button onClick={submit} disabled={!text}>Submit</Button>}
            {revealed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-3">
                <div className={cn("rounded-lg p-3 text-center text-sm border-2", revealed.player ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10")}>
                  You: {revealed.player ? "✅ Right" : "❌ Wrong"}
                </div>
                <div className={cn("rounded-lg p-3 text-center text-sm border-2", revealed.ai ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10")}>
                  AI: {revealed.ai ? "✅ Right" : "❌ Wrong"}
                </div>
                <div className="col-span-2 text-xs text-muted-foreground italic text-center">Answer: {q.answer} — {q.explanation}</div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardBattle;
