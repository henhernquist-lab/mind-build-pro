import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Timer, Zap, Target, Brain, Flame, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useRank, ACADEMIC_RANKS, getRank } from "@/lib/ranks2";
import { sfx } from "@/lib/sounds";
import { GameLobby } from "@/components/games/GameLobby";
import { GameResults } from "@/components/games/GameResults";
import { ComboCounter, comboMultiplier } from "@/components/games/ComboCounter";
import { cn } from "@/lib/utils";

type Op = "+" | "-" | "×" | "÷";
interface Problem { a: number; b: number; op: Op; answer: number; text: string }

const SESSION_SECONDS = 60;
const BEST_KEY = "speedMathBlitz.best.v1"; // { bestCount, bestAvgMs, bestStreak }

interface BestRecord {
  bestCount: number;
  bestAvgMs: number; // lower is better
  bestStreak: number;
}

const loadBest = (): BestRecord => {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return { bestCount: 0, bestAvgMs: 0, bestStreak: 0 };
    return JSON.parse(raw);
  } catch {
    return { bestCount: 0, bestAvgMs: 0, bestStreak: 0 };
  }
};
const saveBest = (b: BestRecord) => localStorage.setItem(BEST_KEY, JSON.stringify(b));

const rint = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

/**
 * Difficulty scales with academic rank tier index 0..4.
 * Tier 0: 1-12 add/sub
 * Tier 1: + sub up to 25, mult to 10
 * Tier 2: 2-digit add/sub, mult 12, easy div
 * Tier 3: 3-digit add/sub, mult to 15, division (clean)
 * Tier 4: 3-digit + mult to 20, division, mixed
 */
const generateProblem = (tier: number): Problem => {
  const ops: Op[] =
    tier <= 0 ? ["+", "-"] :
    tier === 1 ? ["+", "-", "×"] :
    ["+", "-", "×", "÷"];
  const op = ops[rint(0, ops.length - 1)];
  let a = 0, b = 0, ans = 0;
  if (op === "+") {
    const cap = [12, 25, 99, 250, 500][Math.min(tier, 4)];
    a = rint(2, cap); b = rint(2, cap); ans = a + b;
  } else if (op === "-") {
    const cap = [12, 25, 99, 250, 500][Math.min(tier, 4)];
    a = rint(2, cap); b = rint(1, a); ans = a - b;
  } else if (op === "×") {
    const aCap = [10, 10, 12, 15, 20][Math.min(tier, 4)];
    const bCap = [10, 10, 12, 15, 20][Math.min(tier, 4)];
    a = rint(2, aCap); b = rint(2, bCap); ans = a * b;
  } else {
    // division -> generate clean result
    const bCap = [5, 8, 10, 12, 15][Math.min(tier, 4)];
    const ansCap = [5, 8, 10, 12, 15][Math.min(tier, 4)];
    b = rint(2, bCap); ans = rint(2, ansCap); a = b * ans;
  }
  return { a, b, op, answer: ans, text: `${a} ${op} ${b}` };
};

type Phase = "lobby" | "playing" | "results";

const SpeedMathBlitz = () => {
  const { user } = useAuth();
  const academic = useRank("academic");
  const tier = useMemo(() => {
    const idx = ACADEMIC_RANKS.findIndex((r) => r.name === academic.rank.name);
    return Math.max(0, idx);
  }, [academic.rank.name]);

  const [phase, setPhase] = useState<Phase>("lobby");
  const [best, setBest] = useState<BestRecord>(loadBest);

  // Active game state
  const [problem, setProblem] = useState<Problem | null>(null);
  const [input, setInput] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [solved, setSolved] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timesMs, setTimesMs] = useState<number[]>([]);
  const [shake, setShake] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const problemStartRef = useRef<number>(0);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        if (s <= 5) sfx.tick();
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Auto-end at zero
  useEffect(() => {
    if (phase === "playing" && secondsLeft === 0) {
      finishGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  const nextProblem = useCallback(() => {
    setProblem(generateProblem(tier));
    setInput("");
    problemStartRef.current = performance.now();
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [tier]);

  const startGame = () => {
    sfx.gameStart();
    setSolved(0);
    setWrong(0);
    setStreak(0);
    setBestStreak(0);
    setTimesMs([]);
    setSecondsLeft(SESSION_SECONDS);
    setPhase("playing");
    setProblem(generateProblem(tier));
    setInput("");
    problemStartRef.current = performance.now();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const finishGame = useCallback(async () => {
    sfx.gameOver();
    setPhase("results");

    const avg = timesMs.length
      ? Math.round(timesMs.reduce((a, b) => a + b, 0) / timesMs.length)
      : 0;

    // Update best record
    setBest((prev) => {
      const next: BestRecord = {
        bestCount: Math.max(prev.bestCount, solved),
        bestAvgMs:
          avg > 0 && (prev.bestAvgMs === 0 || avg < prev.bestAvgMs)
            ? avg
            : prev.bestAvgMs,
        bestStreak: Math.max(prev.bestStreak, bestStreak),
      };
      saveBest(next);
      return next;
    });

    // XP: 1 per correct + streak bonus, capped
    const xp = Math.min(80, solved + Math.floor(bestStreak / 2));
    if (xp > 0) await academic.addXp(xp);
  }, [timesMs, solved, bestStreak, academic]);

  const submit = () => {
    if (!problem) return;
    const trimmed = input.trim();
    if (trimmed === "") return;
    const guess = Number(trimmed);
    if (Number.isNaN(guess)) return;

    if (guess === problem.answer) {
      const elapsed = Math.round(performance.now() - problemStartRef.current);
      setTimesMs((t) => [...t, elapsed]);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
      setSolved((s) => s + 1);
      if (newStreak >= 3 && newStreak % 1 === 0) sfx.combo(newStreak);
      else sfx.correct();
      nextProblem();
    } else {
      setWrong((w) => w + 1);
      setStreak(0);
      sfx.wrong();
      setShake(true);
      setTimeout(() => setShake(false), 220);
      setInput("");
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
  };

  // Auto-submit when input matches answer length-ish
  useEffect(() => {
    if (!problem || phase !== "playing") return;
    const trimmed = input.trim();
    if (!trimmed) return;
    const guess = Number(trimmed);
    if (Number.isNaN(guess)) return;
    if (String(Math.abs(problem.answer)).length === trimmed.replace(/^-/, "").length) {
      // give it a tick to allow more typing for fast typers? we just submit immediately
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const accuracy =
    solved + wrong === 0 ? 0 : Math.round((solved / (solved + wrong)) * 100);
  const avgMs = timesMs.length
    ? Math.round(timesMs.reduce((a, b) => a + b, 0) / timesMs.length)
    : 0;

  // ---------- LOBBY ----------
  if (phase === "lobby") {
    const tierName = ["Warm-up", "Quick", "Sharp", "Lightning", "Ludicrous"][Math.min(tier, 4)];
    return (
      <GameLobby
        emoji="⚡"
        title="Speed Math Blitz"
        tagline="Pure mental math. Solve as many problems as you can in 60 seconds. Build streaks for bonus XP."
        difficultyLabel={`Difficulty: ${tierName} (scales with rank)`}
        rules={[
          "Type your answer and press Enter (auto-submits when length matches).",
          "Wrong answers reset your streak. The clock keeps ticking.",
          "Streaks of 3+ multiply your visible combo. Higher streaks = more XP at the end.",
          "Difficulty scales with your Academic rank — climb to unlock harder problems.",
        ]}
        stats={[
          {
            label: "Personal Best",
            value: best.bestCount > 0 ? best.bestCount : "—",
            icon: <Trophy className="h-3 w-3" />,
          },
          {
            label: "Fastest Avg",
            value: best.bestAvgMs > 0 ? `${best.bestAvgMs}ms` : "—",
            icon: <Timer className="h-3 w-3" />,
          },
          {
            label: "Best Streak",
            value: best.bestStreak > 0 ? best.bestStreak : "—",
            icon: <Flame className="h-3 w-3" />,
          },
        ]}
        onStart={startGame}
        primaryActionLabel="Start 60s Blitz"
      />
    );
  }

  // ---------- RESULTS ----------
  if (phase === "results") {
    const xp = Math.min(80, solved + Math.floor(bestStreak / 2));
    const isNewBest =
      solved > 0 &&
      (solved > best.bestCount ||
        (avgMs > 0 && (best.bestAvgMs === 0 || avgMs < best.bestAvgMs)) ||
        bestStreak > best.bestStreak);
    return (
      <div className="p-4 md:p-8 pb-24">
        <GameResults
          emoji="⚡"
          title={solved === 0 ? "Time's up" : `${solved} solved!`}
          subtitle={
            solved === 0
              ? "Don't sweat it — try a slower pace next round."
              : `Average response: ${avgMs}ms`
          }
          xpEarned={xp}
          bestStreak={bestStreak}
          accuracy={accuracy}
          isNewBest={isNewBest}
          stats={[
            { label: "Correct", value: solved, highlight: true },
            { label: "Wrong", value: wrong },
            { label: "Average response", value: `${avgMs}ms` },
            { label: "Personal best", value: best.bestCount, highlight: solved > best.bestCount },
            { label: "Difficulty tier", value: getRank(academic.xp, ACADEMIC_RANKS).name },
          ]}
          onPlayAgain={startGame}
        />
      </div>
    );
  }

  // ---------- PLAYING ----------
  const timePct = (secondsLeft / SESSION_SECONDS) * 100;
  const timeColor =
    secondsLeft <= 5 ? "bg-rose-500" : secondsLeft <= 15 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      {/* Top HUD */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Timer className="h-4 w-4 text-primary" />
            <span className="tabular-nums">{secondsLeft}s</span>
          </div>
          <ComboCounter streak={streak} compact />
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <Target className="h-3 w-3" /> {solved}
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <Brain className="h-3 w-3" /> {wrong}
            </span>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className={cn("h-full", timeColor)}
            initial={false}
            animate={{ width: `${timePct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Problem */}
      <AnimatePresence mode="wait">
        {problem && (
          <motion.div
            key={problem.text + solved + wrong}
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              x: shake ? [-12, 12, -8, 8, 0] : 0,
            }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="rounded-3xl border border-border bg-card p-10 text-center"
          >
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Solve
            </div>
            <div className="text-6xl md:text-7xl font-black tabular-nums mb-6 select-none">
              {problem.text}
            </div>
            <Input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="="
              className={cn(
                "h-16 text-center text-3xl font-black tabular-nums max-w-[240px] mx-auto",
                shake && "border-rose-500"
              )}
            />
            <p className="text-[11px] text-muted-foreground mt-3">
              Press Enter or just type the answer
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={finishGame}
        className="mt-4 mx-auto block text-xs text-muted-foreground hover:text-foreground"
      >
        End game early
      </button>
    </div>
  );
};

export default SpeedMathBlitz;