import { Link } from "react-router-dom";
import { Swords, Zap, Mic, Map, Gamepad2 } from "lucide-react";

const GAMES = [
  { to: "/games/bosses", title: "Boss Battles", emoji: "⚔️", desc: "Defeat a boss per subject." , ready: true},
  { to: "/games/flashcards", title: "Flashcard Battle", emoji: "🃏", desc: "Head-to-head AI rounds." , ready: true},
  { to: "/games/debate", title: "Debate Club", emoji: "🎤", desc: "3-round debate, judge scorecard." , ready: true},
  { to: "/games/blitz", title: "Speed Math Blitz", emoji: "⚡", desc: "60-second mental math sprint. Build streaks for bonus XP.", ready: true},
  { to: "#", title: "Georgia Conquest", emoji: "🗺️", desc: "Coming next — capture GA regions." , ready: false},
  { to: "#", title: "Algebra Dungeon", emoji: "🎮", desc: "Coming next — math-gated dungeon crawler." , ready: false},
];

const GamesIndex = () => (
  <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
    <header className="mb-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Games</p>
      <h1 className="text-3xl font-bold mt-1">🎮 Study Games</h1>
      <p className="text-sm text-muted-foreground mt-1">All games feed into your Academic Rank. Difficulty scales with your rank.</p>
    </header>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {GAMES.map((g) => (
        <Link key={g.title} to={g.ready ? g.to : "#"} className={`rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors ${!g.ready && "opacity-60 pointer-events-none"}`}>
          <div className="text-3xl mb-2">{g.emoji}</div>
          <div className="font-bold">{g.title}</div>
          <div className="text-xs text-muted-foreground mt-1">{g.desc}</div>
          {!g.ready && <div className="text-[10px] uppercase tracking-widest mt-2 text-orange-500">In the works</div>}
        </Link>
      ))}
    </div>
  </div>
);

export default GamesIndex;
