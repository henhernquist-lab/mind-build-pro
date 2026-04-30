import { useEffect, useState } from "react";
import { Loader2, Heart, Coins, Skull, DoorOpen } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRank } from "@/lib/ranks2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sounds";

type Cell = "wall" | "floor" | "exit" | "treasure" | "monster";

const W = 7;
const H = 7;

const DIFFICULTY: Record<string, { range: [number, number]; ops: string[]; lives: number }> = {
  Freshman:       { range: [1, 10],  ops: ["+", "-"],          lives: 5 },
  "Honor Roll":   { range: [2, 15],  ops: ["+", "-", "×"],     lives: 4 },
  "Dean's List":  { range: [3, 20],  ops: ["+", "-", "×", "÷"], lives: 4 },
  Scholar:        { range: [5, 30],  ops: ["+", "-", "×", "÷"], lives: 3 },
  Valedictorian:  { range: [10, 50], ops: ["+", "-", "×", "÷"], lives: 3 },
};

const genProblem = (rankName: string) => {
  const cfg = DIFFICULTY[rankName] ?? DIFFICULTY.Freshman;
  const op = cfg.ops[Math.floor(Math.random() * cfg.ops.length)];
  const [lo, hi] = cfg.range;
  const rand = () => Math.floor(Math.random() * (hi - lo + 1)) + lo;
  let a = rand(), b = rand(), ans = 0;
  if (op === "+") ans = a + b;
  else if (op === "-") {
    if (b > a) [a, b] = [b, a];
    ans = a - b;
  } else if (op === "×") ans = a * b;
  else if (op === "÷") {
    ans = rand();
    a = ans * b;
  }
  // Solve for x sometimes
  if (Math.random() < 0.4 && (op === "+" || op === "-")) {
    return { question: `${a} ${op} x = ${ans}`, answer: op === "+" ? String(ans - a) : String(a - ans) };
  }
  return { question: `${a} ${op} ${b} = ?`, answer: String(ans) };
};

const genFloor = (level: number): { grid: Cell[][]; start: [number, number]; exit: [number, number] } => {
  const grid: Cell[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => "floor" as Cell));
  // Border walls
  for (let x = 0; x < W; x++) { grid[0][x] = "wall"; grid[H - 1][x] = "wall"; }
  for (let y = 0; y < H; y++) { grid[y][0] = "wall"; grid[y][W - 1] = "wall"; }
  // Random interior walls
  const wallCount = 6 + level * 2;
  for (let i = 0; i < wallCount; i++) {
    const x = 1 + Math.floor(Math.random() * (W - 2));
    const y = 1 + Math.floor(Math.random() * (H - 2));
    grid[y][x] = "wall";
  }
  // Treasures + monsters
  const treasures = 2 + Math.floor(level / 2);
  const monsters = Math.min(3, 1 + Math.floor(level / 2));
  let placed = 0;
  while (placed < treasures) {
    const x = 1 + Math.floor(Math.random() * (W - 2));
    const y = 1 + Math.floor(Math.random() * (H - 2));
    if (grid[y][x] === "floor") { grid[y][x] = "treasure"; placed++; }
  }
  placed = 0;
  while (placed < monsters) {
    const x = 1 + Math.floor(Math.random() * (W - 2));
    const y = 1 + Math.floor(Math.random() * (H - 2));
    if (grid[y][x] === "floor") { grid[y][x] = "monster"; placed++; }
  }
  // Player start + exit
  const start: [number, number] = [1, 1];
  grid[1][1] = "floor";
  const exit: [number, number] = [W - 2, H - 2];
  grid[H - 2][W - 2] = "exit";
  return { grid, start, exit };
};

const AlgebraDungeon = () => {
  const { user } = useAuth();
  const academic = useRank("academic");

  const [phase, setPhase] = useState<"select" | "play" | "won" | "lost">("select");
  const [level, setLevel] = useState(1);
  const [floor, setFloor] = useState(() => genFloor(1));
  const [pos, setPos] = useState<[number, number]>([1, 1]);
  const [hp, setHp] = useState(5);
  const [maxHp, setMaxHp] = useState(5);
  const [gold, setGold] = useState(0);
  const [problem, setProblem] = useState<{ question: string; answer: string } | null>(null);
  const [pendingType, setPendingType] = useState<"monster" | "exit" | null>(null);
  const [text, setText] = useState("");
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; text: string; tone: "good" | "bad" | "gold" }[]>([]);
  const [floorFlash, setFloorFlash] = useState(false);

  const spawnFloat = (x: number, y: number, text: string, tone: "good" | "bad" | "gold") => {
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, x, y, text, tone }]);
    setTimeout(() => setFloats((f) => f.filter((v) => v.id !== id)), 1100);
  };

  const start = () => {
    const cfg = DIFFICULTY[academic.rank.name] ?? DIFFICULTY.Freshman;
    const f = genFloor(1);
    setFloor(f);
    setPos(f.start);
    setLevel(1);
    setHp(cfg.lives);
    setMaxHp(cfg.lives);
    setGold(0);
    setPhase("play");
  };

  const move = (dx: number, dy: number) => {
    if (problem) return;
    const [x, y] = pos;
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
    const cell = floor.grid[ny][nx];
    if (cell === "wall") return;
    if (cell === "monster") {
      setProblem(genProblem(academic.rank.name));
      setPendingType("monster");
      // Move to monster cell on win
      setPos([nx, ny]);
      return;
    }
    if (cell === "exit") {
      setProblem(genProblem(academic.rank.name));
      setPendingType("exit");
      setPos([nx, ny]);
      return;
    }
    setPos([nx, ny]);
    if (cell === "treasure") {
      const reward = 5 + level * 5;
      setGold((g) => g + reward);
      const grid = floor.grid.map((r) => r.slice()) as Cell[][];
      grid[ny][nx] = "floor";
      setFloor({ ...floor, grid });
      academic.addXp(5);
      toast.success(`💰 +${reward} gold`);
    }
  };

  const submit = async () => {
    if (!problem) return;
    const right = text.trim() === problem.answer;
    if (right) {
      if (pendingType === "monster") {
        const grid = floor.grid.map((r) => r.slice()) as Cell[][];
        const [x, y] = pos;
        grid[y][x] = "floor";
        setFloor({ ...floor, grid });
        await academic.addXp(10);
        toast.success("⚔️ Monster defeated! +10 XP");
      } else if (pendingType === "exit") {
        await academic.addXp(30);
        const nextLevel = level + 1;
        if (nextLevel > 5) {
          await academic.addXp(150);
          toast.success(`🏆 Dungeon cleared! +150 bonus XP, ${gold} gold`);
          setPhase("won");
          return;
        }
        toast.success(`🚪 Floor ${level} cleared! +30 XP`);
        const f = genFloor(nextLevel);
        setFloor(f);
        setPos(f.start);
        setLevel(nextLevel);
        setHp((h) => Math.min(maxHp, h + 1));
      }
    } else {
      const newHp = hp - 1;
      setHp(newHp);
      toast.error(`❌ Wrong! Answer was ${problem.answer}. -1 HP`);
      if (newHp <= 0) {
        setPhase("lost");
        return;
      }
    }
    setProblem(null);
    setPendingType(null);
    setText("");
  };

  // Keyboard controls
  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (problem) return;
      if (e.key === "ArrowUp" || e.key === "w") move(0, -1);
      else if (e.key === "ArrowDown" || e.key === "s") move(0, 1);
      else if (e.key === "ArrowLeft" || e.key === "a") move(-1, 0);
      else if (e.key === "ArrowRight" || e.key === "d") move(1, 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, pos, problem, floor]);

  if (phase === "select") {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Game</p>
          <h1 className="text-3xl font-bold mt-1">🎮 Algebra Dungeon</h1>
          <p className="text-sm text-muted-foreground mt-1">
            5 floors. Solve math to fight monsters and unlock exits. Difficulty scales with your academic rank.
          </p>
        </header>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="text-sm">
            Current rank: <b>{academic.rank.icon} {academic.rank.name}</b>
          </div>
          <div className="text-xs text-muted-foreground">
            Lives: {(DIFFICULTY[academic.rank.name] ?? DIFFICULTY.Freshman).lives} •
            Operators: {(DIFFICULTY[academic.rank.name] ?? DIFFICULTY.Freshman).ops.join(" ")} •
            Range: {(DIFFICULTY[academic.rank.name] ?? DIFFICULTY.Freshman).range.join("–")}
          </div>
          <Button onClick={start} className="w-full" size="lg"><DoorOpen className="h-4 w-4 mr-1.5" /> Enter dungeon</Button>
        </div>
      </div>
    );
  }

  if (phase === "won" || phase === "lost") {
    return (
      <div className="p-6 md:p-10 max-w-xl mx-auto pb-24 text-center">
        <div className="text-6xl mb-3">{phase === "won" ? "🏆" : "💀"}</div>
        <h1 className="text-3xl font-bold">{phase === "won" ? "Dungeon Cleared!" : "You Died"}</h1>
        <p className="mt-2 text-muted-foreground">
          {phase === "won" ? `Floors cleared: 5 • Gold: ${gold}` : `Made it to floor ${level}`}
        </p>
        <Button className="mt-6" onClick={() => setPhase("select")}>Play again</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <header className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Floor {level} / 5</p>
          <h1 className="text-xl font-bold">🎮 Algebra Dungeon</h1>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4 text-red-500" /> {hp}/{maxHp}</span>
          <span className="inline-flex items-center gap-1"><Coins className="h-4 w-4 text-yellow-500" /> {gold}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-3 select-none">
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${W}, minmax(0, 1fr))` }}
          >
            {floor.grid.map((row, y) =>
              row.map((cell, x) => {
                const isPlayer = pos[0] === x && pos[1] === y;
                let bg = "hsl(var(--muted))";
                let content = "";
                if (cell === "wall") bg = "hsl(var(--border))";
                else if (cell === "treasure") { bg = "hsl(45 90% 55% / 0.2)"; content = "💰"; }
                else if (cell === "monster") { bg = "hsl(0 70% 55% / 0.25)"; content = "👹"; }
                else if (cell === "exit") { bg = "hsl(140 70% 45% / 0.25)"; content = "🚪"; }
                return (
                  <div
                    key={`${x}-${y}`}
                    className="aspect-square rounded text-center text-base flex items-center justify-center"
                    style={{ background: bg }}
                  >
                    {isPlayer ? "🧙" : content}
                  </div>
                );
              }),
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1 max-w-[180px] mx-auto md:hidden">
            <div />
            <Button size="sm" variant="outline" onClick={() => move(0, -1)}>↑</Button>
            <div />
            <Button size="sm" variant="outline" onClick={() => move(-1, 0)}>←</Button>
            <Button size="sm" variant="outline" onClick={() => move(0, 1)}>↓</Button>
            <Button size="sm" variant="outline" onClick={() => move(1, 0)}>→</Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2 hidden md:block">Use arrow keys or WASD to move</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 min-h-[200px]">
          {problem ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {pendingType === "monster" ? "⚔️ Monster encounter" : "🚪 Sealed door"}
              </div>
              <div className="text-2xl font-bold text-center py-2">{problem.question}</div>
              <Input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Your answer"
                className="text-center text-lg"
              />
              <Button className="w-full" onClick={submit} disabled={!text.trim()}>Submit</Button>
            </motion.div>
          ) : (
            <div className="text-center py-10">
              <Skull className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                Move the wizard to fight monsters and reach the green door.
              </p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setPhase("select")}>Quit run</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlgebraDungeon;