import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/sounds";

interface HypeCountdownProps {
  title: string;
  emoji: string;
  subject?: string;
  rankLabel?: string;
  rankIcon?: string;
  onComplete: () => void;
}

/**
 * Full-screen pre-game hype overlay. Shows title + rank + subject,
 * then a 3-2-1-GO! countdown before calling onComplete().
 */
export const HypeCountdown = ({
  title,
  emoji,
  subject,
  rankLabel,
  rankIcon,
  onComplete,
}: HypeCountdownProps) => {
  const [n, setN] = useState<number | "GO">(3);

  useEffect(() => {
    let cancelled = false;
    const seq: Array<number | "GO"> = [3, 2, 1, "GO"];
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      setN(seq[i]);
      try {
        sfx.play(i === 3 ? "success" : "click");
      } catch {}
      i++;
      if (i < seq.length) {
        setTimeout(tick, 800);
      } else {
        setTimeout(() => !cancelled && onComplete(), 600);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-7xl mb-3"
        >
          {emoji}
        </motion.div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight">{title}</h2>
        {subject && (
          <p className="text-sm uppercase tracking-widest text-muted-foreground mt-2">
            Subject · <span className="text-foreground font-bold">{subject}</span>
          </p>
        )}
        {rankLabel && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {rankIcon && <span>{rankIcon}</span>} Rank · {rankLabel}
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={String(n)}
          initial={{ scale: 0.4, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.6, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className={
            n === "GO"
              ? "text-8xl md:text-9xl font-black text-primary drop-shadow-[0_0_30px_hsl(var(--primary)/0.6)]"
              : "text-8xl md:text-9xl font-black tabular-nums"
          }
        >
          {n}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default HypeCountdown;