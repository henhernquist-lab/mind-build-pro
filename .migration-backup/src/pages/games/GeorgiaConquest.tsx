import { useEffect, useMemo, useState } from "react";
import { Loader2, Map as MapIcon, Swords, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRank } from "@/lib/ranks2";
import { useSubjects } from "@/lib/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubjectPicker } from "@/components/games/SubjectPicker";
import { callGame } from "@/lib/games/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type RegionId = "blueridge" | "ridgevalley" | "appalachian" | "piedmont" | "coastal";
type Owner = "player" | "ai" | "neutral";

type Region = {
  id: RegionId;
  name: string;
  emoji: string;
  // Rough simplified outline coordinates inside a 400x500 viewBox of GA
  d: string;
  // Adjacency list
  borders: RegionId[];
  // Centroid for label
  cx: number;
  cy: number;
};

const REGIONS: Region[] = [
  {
    id: "blueridge", name: "Blue Ridge Mountains", emoji: "⛰️",
    d: "M120,40 L210,30 L240,80 L180,110 L130,100 Z",
    borders: ["ridgevalley", "appalachian", "piedmont"], cx: 175, cy: 70,
  },
  {
    id: "ridgevalley", name: "Ridge & Valley", emoji: "🏞️",
    d: "M40,60 L120,40 L130,100 L70,140 L30,120 Z",
    borders: ["blueridge", "appalachian", "piedmont"], cx: 80, cy: 95,
  },
  {
    id: "appalachian", name: "Appalachian Plateau", emoji: "🪨",
    d: "M40,60 L80,20 L210,30 L120,40 Z",
    borders: ["blueridge", "ridgevalley"], cx: 130, cy: 40,
  },
  {
    id: "piedmont", name: "Piedmont", emoji: "🌳",
    d: "M70,140 L130,100 L180,110 L240,80 L290,150 L240,240 L130,240 L70,180 Z",
    borders: ["blueridge", "ridgevalley", "coastal"], cx: 175, cy: 175,
  },
  {
    id: "coastal", name: "Coastal Plain", emoji: "🌊",
    d: "M130,240 L240,240 L290,150 L350,250 L320,420 L180,460 L100,400 L80,300 Z",
    borders: ["piedmont"], cx: 220, cy: 340,
  },
];

const initialOwners = (start: RegionId): Record<RegionId, Owner> => {
  const o: Record<RegionId, Owner> = {} as any;
  REGIONS.forEach((r) => (o[r.id] = "ai"));
  o[start] = "player";
  return o;
};

const REGION = (id: RegionId) => REGIONS.find((r) => r.id === id)!;

const GeorgiaConquest = () => {
  const { user, profile } = useAuth();
  const academic = useRank("academic");
  const subjects = useSubjects();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "algebra");
  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];

  const [phase, setPhase] = useState<"select" | "play" | "won" | "lost">("select");
  const [startRegion, setStartRegion] = useState<RegionId>("piedmont");
  const [owners, setOwners] = useState<Record<RegionId, Owner>>(() => initialOwners("piedmont"));
  const [turn, setTurn] = useState<"player" | "ai">("player");
  const [target, setTarget] = useState<RegionId | null>(null);
  const [q, setQ] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState<null | { right: boolean }>(null);
  const [log, setLog] = useState<string[]>([]);
  const [turnNo, setTurnNo] = useState(1);

  const playerRegions = useMemo(() => REGIONS.filter((r) => owners[r.id] === "player"), [owners]);
  const aiRegions = useMemo(() => REGIONS.filter((r) => owners[r.id] === "ai"), [owners]);

  // Adjacent enemy regions the player can attack
  const attackable = useMemo(() => {
    const set = new Set<RegionId>();
    for (const r of playerRegions) {
      for (const b of r.borders) {
        if (owners[b] === "ai") set.add(b);
      }
    }
    return set;
  }, [playerRegions, owners]);

  const start = (rid: RegionId) => {
    setStartRegion(rid);
    setOwners(initialOwners(rid));
    setTurn("player");
    setTurnNo(1);
    setLog([`🟢 You start in ${REGION(rid).name}.`]);
    setPhase("play");
  };

  const attack = async (rid: RegionId) => {
    if (loading || revealed || turn !== "player") return;
    setTarget(rid);
    setLoading(true);
    setText("");
    setRevealed(null);
    try {
      const next = await callGame({
        mode: "question",
        subject: subject?.label ?? "General",
        academicRank: academic.rank.name,
        context: `Region capture battle: invading ${REGION(rid).name}.`,
        avoid: [],
      });
      setQ(next);
    } catch (e: any) {
      toast.error("Couldn't load question");
      setTarget(null);
    } finally {
      setLoading(false);
    }
  };

  const norm = (s: string) => (s ?? "").trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");

  const submit = async () => {
    if (!q || !target) return;
    const right =
      norm(text) === norm(q.answer) || (text && norm(q.answer).includes(norm(text)));
    setRevealed({ right: !!right });
    if (right) {
      const newOwners = { ...owners, [target]: "player" as Owner };
      setOwners(newOwners);
      await academic.addXp(20);
      setLog((l) => [`⚔️ You captured ${REGION(target).name}! +20 XP`, ...l].slice(0, 8));
      // Check victory
      if (Object.values(newOwners).every((o) => o === "player")) {
        const bonus = 100;
        await academic.addXp(bonus);
        toast.success(`🏆 You conquered Georgia! +${bonus} bonus XP`);
        setPhase("won");
        return;
      }
    } else {
      setLog((l) => [`❌ Failed to take ${REGION(target).name}. Answer was: ${q.answer}`, ...l].slice(0, 8));
    }
    setTimeout(() => {
      setQ(null);
      setTarget(null);
      setRevealed(null);
      setText("");
      setTurn("ai");
      runAiTurn();
    }, 1500);
  };

  const skipTurn = () => {
    setLog((l) => ["⏭️ You skipped your attack.", ...l].slice(0, 8));
    setTurn("ai");
    setTimeout(runAiTurn, 600);
  };

  const runAiTurn = async () => {
    // AI tries to attack a random adjacent player region
    setTimeout(async () => {
      const targets = new Set<RegionId>();
      for (const r of aiRegionsOf(owners)) {
        for (const b of r.borders) if (owners[b] === "player") targets.add(b);
      }
      const arr = Array.from(targets);
      if (arr.length === 0) {
        setLog((l) => ["🤖 AI has no border with you — turn skipped.", ...l].slice(0, 8));
      } else {
        const pick = arr[Math.floor(Math.random() * arr.length)];
        // AI win chance scales with player rank (harder when stronger)
        const rankIdx = ["Freshman", "Honor Roll", "Dean's List", "Scholar", "Valedictorian"].indexOf(
          academic.rank.name,
        );
        const aiAcc = 0.35 + Math.max(0, rankIdx) * 0.1;
        if (Math.random() < aiAcc) {
          // Don't let AI take your last region
          const remaining = REGIONS.filter((r) => owners[r.id] === "player").length;
          if (remaining <= 1) {
            setLog((l) => [`🛡️ AI tried to take ${REGION(pick).name} but you held your capital.`, ...l].slice(0, 8));
          } else {
            const newOwners = { ...owners, [pick]: "ai" as Owner };
            setOwners(newOwners);
            setLog((l) => [`💥 AI captured ${REGION(pick).name}!`, ...l].slice(0, 8));
            const playerLeft = Object.values(newOwners).filter((o) => o === "player").length;
            if (playerLeft === 0) {
              toast.error("💀 AI conquered all of Georgia.");
              setPhase("lost");
              return;
            }
          }
        } else {
          setLog((l) => [`🛡️ AI failed to capture ${REGION(pick).name}.`, ...l].slice(0, 8));
        }
      }
      setTurn("player");
      setTurnNo((t) => t + 1);
    }, 800);
  };

  const aiRegionsOf = (o: Record<RegionId, Owner>) => REGIONS.filter((r) => o[r.id] === "ai");

  if (phase === "select") {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Game</p>
          <h1 className="text-3xl font-bold mt-1">🗺️ Georgia Conquest</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture all 5 regions of Georgia by answering questions. Difficulty scales with your academic rank.
          </p>
        </header>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <SubjectPicker subjects={subjects} value={subjectId} onChange={setSubjectId} />
          <div>
            <div className="text-xs text-muted-foreground mb-2">Pick your starting region:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setStartRegion(r.id)}
                  className={cn(
                    "rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-colors",
                    startRegion === r.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="font-bold">{r.emoji} {r.name}</div>
                  <div className="text-[11px] text-muted-foreground">Borders: {r.borders.length}</div>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => start(startRegion)} className="w-full" size="lg">
            <Swords className="h-4 w-4 mr-1.5" /> Begin conquest
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "won" || phase === "lost") {
    const won = phase === "won";
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto pb-24 text-center">
        <div className="text-6xl mb-3">{won ? "🏆" : "💀"}</div>
        <h1 className="text-3xl font-bold">{won ? "Conqueror of Georgia!" : "Conquest Failed"}</h1>
        <p className="mt-2 text-muted-foreground">
          {won ? `It took you ${turnNo} turn${turnNo === 1 ? "" : "s"}.` : "The AI swept your territory."}
        </p>
        <Button className="mt-6" onClick={() => setPhase("select")}>Play again</Button>
      </div>
    );
  }

  // Play
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24">
      <header className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Turn {turnNo} • {turn === "player" ? "Your move" : "AI thinking…"}</p>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MapIcon className="h-5 w-5" /> Georgia Conquest</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setPhase("select")}>Quit</Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-3">
          <svg viewBox="0 0 400 500" className="w-full h-auto">
            {REGIONS.map((r) => {
              const o = owners[r.id];
              const isAttackable = attackable.has(r.id) && turn === "player" && !target;
              const fill =
                o === "player" ? "hsl(var(--primary) / 0.6)" :
                o === "ai" ? "hsl(0 70% 55% / 0.5)" : "hsl(var(--muted) / 0.4)";
              const stroke = isAttackable ? "hsl(45 95% 55%)" : "hsl(var(--border))";
              return (
                <g key={r.id} onClick={() => isAttackable && attack(r.id)} style={{ cursor: isAttackable ? "pointer" : "default" }}>
                  <motion.path
                    d={r.d}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isAttackable ? 3 : 1.5}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                  />
                  <text x={r.cx} y={r.cy} textAnchor="middle" fontSize="14" fill="hsl(var(--foreground))" pointerEvents="none">
                    {r.emoji}
                  </text>
                  <text x={r.cx} y={r.cy + 14} textAnchor="middle" fontSize="8" fill="hsl(var(--foreground))" pointerEvents="none">
                    {r.name.split(" ")[0]}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="flex gap-3 justify-center text-[11px] mt-2">
            <span><span className="inline-block h-3 w-3 rounded mr-1 align-middle" style={{ background: "hsl(var(--primary) / 0.6)" }} />You ({playerRegions.length})</span>
            <span><span className="inline-block h-3 w-3 rounded mr-1 align-middle" style={{ background: "hsl(0 70% 55% / 0.5)" }} />AI ({aiRegions.length})</span>
            <span><span className="inline-block h-3 w-3 rounded mr-1 align-middle border border-yellow-500" />Attackable</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4 min-h-[200px]">
            {target && q ? (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Capturing {REGION(target).name}
                </div>
                <p className="text-sm font-medium">{q.question}</p>
                {q.choices ? (
                  <div className="grid gap-1.5">
                    {q.choices.map((c: string) => (
                      <button
                        key={c}
                        onClick={() => setText(c)}
                        disabled={!!revealed}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-left text-xs",
                          revealed && norm(c) === norm(q.answer) && "border-green-500 bg-green-500/10",
                          !revealed && text === c && "border-primary bg-primary/10",
                          !revealed && text !== c && "border-border hover:bg-accent",
                        )}
                      >{c}</button>
                    ))}
                  </div>
                ) : (
                  <Input value={text} onChange={(e) => setText(e.target.value)} disabled={!!revealed} onKeyDown={(e) => e.key === "Enter" && submit()} />
                )}
                {!revealed && <Button size="sm" className="w-full" onClick={submit} disabled={!text}>Attack!</Button>}
                {revealed && (
                  <div className={cn("text-center text-sm font-bold", revealed.right ? "text-green-500" : "text-destructive")}>
                    {revealed.right ? "✅ Captured!" : "❌ Repelled"}
                  </div>
                )}
              </div>
            ) : loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <div className="text-center py-6">
                <Trophy className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                  {turn === "player"
                    ? attackable.size > 0
                      ? "Tap a glowing region to invade."
                      : "No bordering enemies. Skip turn."
                    : "AI is plotting…"}
                </p>
                {turn === "player" && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={skipTurn}>Skip turn</Button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Battle log</div>
            <div className="space-y-1 text-xs max-h-40 overflow-auto">
              {log.map((l, i) => <div key={i} className="text-muted-foreground">{l}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeorgiaConquest;