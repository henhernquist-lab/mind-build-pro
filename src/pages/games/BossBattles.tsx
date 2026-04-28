import { useEffect, useState, useCallback } from "react";
import { Heart, Loader2, Swords, Edit3, Save } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSubjects, type Subject } from "@/lib/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRank, ATHLETIC_RANKS, ACADEMIC_RANKS, getRank } from "@/lib/ranks2";
import { fetchUserStats } from "@/lib/workouts";
import { callGame, generateBoss } from "@/lib/games/api";
import { QuestionPrompt, type Q } from "@/components/games/QuestionPrompt";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Boss = { name: string; personality: string; emoji: string };

const DEFAULT_BOSSES: Record<string, Boss> = {
  algebra: { name: "The Equation", personality: "Cold, robotic, speaks in math terms.", emoji: "🤖" },
  langlit: { name: "The Wordsmith", personality: "Dramatic, Shakespearean, loves riddles.", emoji: "📜" },
  georgia: { name: "The Governor", personality: "Patriotic, political, throws dates at you.", emoji: "🎩" },
  science: { name: "Dr. Newton", personality: "Eccentric genius, makes science puns.", emoji: "🧪" },
  spanish: { name: "El Profesor", personality: "Switches between English and Spanish mid-sentence.", emoji: "🌶️" },
};

const EMOJI_CHOICES = ["🤖","📜","🎩","🧪","🌶️","👑","🐉","💀","🦾","🧙‍♂️"];

const BossBattles = () => {
  const { user, profile } = useAuth();
  const subjects = useSubjects();
  const academic = useRank("academic");
  const [athleticRank, setAthleticRank] = useState("Recruit");
  const [bosses, setBosses] = useState<Record<string, Boss>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [editName, setEditName] = useState("");
  const [editPers, setEditPers] = useState("");
  const [editEmoji, setEditEmoji] = useState("👤");

  // Battle state
  const [battle, setBattle] = useState<{ subject: Subject; boss: Boss; bossHp: number; playerHp: number; round: number; streak: number; asked: string[]; current: Q | null; loadingQ: boolean; line?: string; defeated?: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const stats = await fetchUserStats(user.id);
      setAthleticRank(getRank(stats.xp, ATHLETIC_RANKS).name);
      const { data } = await supabase.from("boss_customizations").select("*").eq("user_id", user.id);
      const map: Record<string, Boss> = {};
      (data ?? []).forEach((r: any) => {
        map[r.subject_id] = { name: r.boss_name, personality: r.boss_personality, emoji: r.boss_emoji ?? "👤" };
      });
      setBosses(map);
      setLoading(false);
    })();
  }, [user?.id]);

  const getBossFor = useCallback(async (s: Subject): Promise<Boss> => {
    if (bosses[s.id]) return bosses[s.id];
    if (DEFAULT_BOSSES[s.id]) return DEFAULT_BOSSES[s.id];
    // Generate dynamically
    const generated = await generateBoss(s.label);
    return generated;
  }, [bosses]);

  const startBattle = async (s: Subject) => {
    if (!user) return;
    const boss = await getBossFor(s);
    setBattle({ subject: s, boss, bossHp: 10, playerHp: 3, round: 1, streak: 0, asked: [], current: null, loadingQ: true });
    const opener = await callGame({ mode: "boss_dialogue", bossName: boss.name, bossPersonality: boss.personality, event: "is starting the battle", bossHp: 10, playerHp: 3, streak: 0 });
    const q = await callGame({ mode: "question", subject: s.label, academicRank: academic.rank.name, studentName: profile?.display_name ?? "you", avoid: [] });
    setBattle((b) => b ? { ...b, line: opener.line, current: q, loadingQ: false } : null);
  };

  const handleAnswer = async (correct: boolean) => {
    if (!battle) return;
    let { bossHp, playerHp, round, streak, asked } = battle;
    const subject = battle.subject;
    const boss = battle.boss;
    asked = [...asked, battle.current!.question];
    let crit = false;
    if (correct) {
      streak += 1;
      let dmg = 1;
      if (streak >= 3) { dmg = 2; crit = true; streak = 0; }
      bossHp = Math.max(0, bossHp - dmg);
    } else {
      streak = 0;
      playerHp -= 1;
    }
    round += 1;

    if (bossHp <= 0) {
      // Victory
      const isLegend = academic.rank.name === "Valedictorian";
      const xp = 150 * (isLegend ? 3 : 1);
      await academic.addXp(xp);
      const dialogue = await callGame({ mode: "boss_dialogue", bossName: boss.name, bossPersonality: boss.personality, event: "has been defeated by the player", bossHp: 0, playerHp, streak });
      toast.success(`🏆 You defeated ${boss.name}!`, { description: `+${xp} Academic XP` });
      setBattle({ ...battle, bossHp, playerHp, round, streak, asked, current: null, line: dialogue.line, defeated: 1 });
      return;
    }
    if (playerHp <= 0) {
      await academic.addXp(10);
      const dialogue = await callGame({ mode: "boss_dialogue", bossName: boss.name, bossPersonality: boss.personality, event: "has defeated the player", bossHp, playerHp: 0, streak: 0 });
      toast.error(`Defeated by ${boss.name}`, { description: "+10 Academic XP consolation" });
      setBattle({ ...battle, bossHp, playerHp, round, streak, asked, current: null, line: dialogue.line, defeated: -1 });
      return;
    }
    if (round > 10) {
      // Out of questions, treat as loss
      await academic.addXp(10);
      setBattle({ ...battle, bossHp, playerHp, round, streak, asked, current: null, line: "Time's up — battle ended.", defeated: -1 });
      return;
    }
    if (correct) await academic.addXp(20);
    const event = correct ? (crit ? "scored a critical hit" : "answered correctly") : "answered wrong";
    const [dialogue, q] = await Promise.all([
      callGame({ mode: "boss_dialogue", bossName: boss.name, bossPersonality: boss.personality, event, bossHp, playerHp, streak }),
      callGame({ mode: "question", subject: subject.label, academicRank: academic.rank.name, avoid: asked }),
    ]);
    setBattle({ ...battle, bossHp, playerHp, round, streak, asked, line: dialogue.line, current: q, loadingQ: false });
  };

  const exitBattle = () => setBattle(null);

  const openEditor = async (s: Subject) => {
    const b = bosses[s.id] ?? DEFAULT_BOSSES[s.id] ?? await generateBoss(s.label);
    setEditing(s);
    setEditName(b.name);
    setEditPers(b.personality);
    setEditEmoji(b.emoji);
  };

  const saveEditor = async () => {
    if (!user || !editing) return;
    await supabase.from("boss_customizations").upsert({ user_id: user.id, subject_id: editing.id, boss_name: editName, boss_personality: editPers, boss_emoji: editEmoji });
    setBosses((b) => ({ ...b, [editing.id]: { name: editName, personality: editPers, emoji: editEmoji } }));
    setEditing(null);
    toast.success("Boss saved");
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (battle) {
    const playerAvatar = profile?.avatar_url;
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">⚔️ {battle.subject.label}</h1>
          <Button variant="ghost" size="sm" onClick={exitBattle}>Exit</Button>
        </div>

        {/* Health bars */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl border-2 border-primary overflow-hidden bg-primary/10 flex items-center justify-center text-2xl font-bold">
              {playerAvatar ? <img src={playerAvatar} className="h-full w-full object-cover" /> : (profile?.display_name?.[0] ?? "Y")}
            </div>
            <div className="mt-2 text-sm font-semibold">{profile?.display_name ?? "You"}</div>
            <div className="mt-2 flex justify-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart key={i} className={cn("h-5 w-5", i < battle.playerHp ? "text-red-500 fill-red-500" : "text-muted-foreground/30")} />
              ))}
            </div>
            {battle.streak >= 2 && <div className="text-xs mt-1 text-orange-500 font-bold animate-pulse">🔥 Streak {battle.streak}</div>}
          </div>
          <motion.div animate={battle.defeated === 1 ? { opacity: 0.3, scale: 0.9 } : {}} className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl border-2 border-destructive bg-destructive/10 flex items-center justify-center text-3xl">{battle.boss.emoji}</div>
            <div className="mt-2 text-sm font-semibold">{battle.boss.name}</div>
            <div className="mt-2 h-3 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full bg-destructive" initial={{ width: "100%" }} animate={{ width: `${(battle.bossHp / 10) * 100}%` }} />
            </div>
            <div className="text-[10px] mt-1 text-muted-foreground">{battle.bossHp}/10</div>
          </motion.div>
        </div>

        {/* Dialogue */}
        <AnimatePresence>
          {battle.line && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-border bg-card p-3 text-sm italic">
              <span className="text-muted-foreground text-xs mr-1">{battle.boss.name}:</span> "{battle.line}"
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question */}
        <div className="rounded-2xl border border-border bg-card p-5">
          {battle.defeated ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">{battle.defeated === 1 ? "🏆" : "💀"}</div>
              <div className="text-lg font-bold mb-3">{battle.defeated === 1 ? "Victory!" : "Defeated"}</div>
              <Button onClick={exitBattle}>Back to bosses</Button>
            </div>
          ) : battle.loadingQ || !battle.current ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <QuestionPrompt q={battle.current} onResolve={handleAnswer} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Game</p>
        <h1 className="text-3xl font-bold mt-1">⚔️ Boss Battles</h1>
        <p className="text-sm text-muted-foreground mt-1">Each subject has a unique boss. Defeat them to earn Academic XP. Difficulty scales to your rank: <span className="font-semibold">{academic.rank.icon} {academic.rank.name}</span></p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subjects.map((s) => {
          const b = bosses[s.id] ?? DEFAULT_BOSSES[s.id] ?? { name: `The ${s.label} Master`, personality: "Mysterious challenger.", emoji: "👤" };
          return (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl mb-1">{b.emoji}</div>
                  <div className="font-bold">{b.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.emoji} {s.label}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => openEditor(s)} title="Edit boss"><Edit3 className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground italic">{b.personality}</p>
              <Button onClick={() => startBattle(s)} className="mt-2"><Swords className="h-4 w-4 mr-1.5" /> Battle</Button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit boss for {editing?.label}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Personality</Label>
              <Textarea value={editPers} onChange={(e) => setEditPers(e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="text-xs">Emoji</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {EMOJI_CHOICES.map((e) => (
                  <button key={e} onClick={() => setEditEmoji(e)} className={cn("h-9 w-9 rounded-lg border text-lg", editEmoji === e ? "border-primary bg-primary/10" : "border-border hover:bg-accent")}>{e}</button>
                ))}
              </div>
            </div>
            <Button onClick={saveEditor} className="w-full"><Save className="h-4 w-4 mr-1.5" /> Save boss</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BossBattles;
