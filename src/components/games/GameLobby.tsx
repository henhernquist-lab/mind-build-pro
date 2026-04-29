import { motion } from "framer-motion";
import { Play, ArrowLeft, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface LobbyStat {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}

interface GameLobbyProps {
  emoji: string;
  title: string;
  tagline: string;
  rules: string[];
  stats?: LobbyStat[];
  difficultyLabel?: string;
  primaryActionLabel?: string;
  onStart: () => void;
  starting?: boolean;
  back?: string;
  children?: ReactNode;
}

export const GameLobby = ({
  emoji,
  title,
  tagline,
  rules,
  stats = [],
  difficultyLabel,
  primaryActionLabel = "Start Game",
  onStart,
  starting,
  back = "/games",
  children,
}: GameLobbyProps) => (
  <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
    <Link
      to={back}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
    >
      <ArrowLeft className="h-4 w-4" /> Back to Games
    </Link>

    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border bg-card overflow-hidden"
    >
      <div className="relative p-8 bg-gradient-to-br from-primary/20 via-card to-card">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="text-6xl mb-3"
        >
          {emoji}
        </motion.div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-prose">{tagline}</p>
        {difficultyLabel && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Zap className="h-3 w-3" /> {difficultyLabel}
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-background/50 p-3"
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {s.icon ?? <Trophy className="h-3 w-3" />} {s.label}
                </div>
                <div className="mt-1 text-xl font-bold tabular-nums">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">How it works</p>
          <ul className="space-y-1.5 text-sm">
            {rules.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary font-bold">{i + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {children}

        <Button
          size="lg"
          variant="premium"
          className="w-full text-base font-bold"
          onClick={onStart}
          disabled={starting}
        >
          <Play className={cn("h-5 w-5 mr-2", starting && "animate-pulse")} />
          {starting ? "Loading..." : primaryActionLabel}
        </Button>
      </div>
    </motion.div>
  </div>
);

export default GameLobby;