import { useState, useEffect } from "react";
import { Timer, X, Check, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export const RestTimerBanner = ({
  duration = 90,
  onClose
}: {
  duration?: number;
  onClose: () => void
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [totalTime, setTotalTime] = useState(duration);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      return;
    }
    const t = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (next <= 10 && next > 0 && navigator.vibrate) {
          navigator.vibrate(20);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const pct = (timeLeft / totalTime) * 100;
  const isEnding = timeLeft <= 10;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] px-4 pt-4 pointer-events-none"
      >
        <div className={cn(
          "max-w-md mx-auto bg-card border-2 rounded-2xl p-4 shadow-2xl pointer-events-auto flex items-center justify-between relative overflow-hidden transition-colors duration-300",
          isEnding ? "border-red-600 bg-red-600/10" : "border-[#00E5FF] bg-card/95 backdrop-blur-xl"
        )}>
          {/* Progress ring background */}
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 flex items-center justify-center">
              <svg className="h-12 w-12 -rotate-90">
                <circle
                  cx="24" cy="24" r="20"
                  fill="none" stroke="currentColor" strokeWidth="4"
                  className="text-muted/20"
                />
                <circle
                  cx="24" cy="24" r="20"
                  fill="none" stroke="currentColor" strokeWidth="4"
                  strokeDasharray={126}
                  strokeDashoffset={126 - (126 * pct) / 100}
                  className={cn(
                    "transition-all duration-1000",
                    isEnding ? "text-red-500" : "text-[#00E5FF]"
                  )}
                />
              </svg>
              <Timer className={cn("absolute h-5 w-5", isEnding ? "text-red-500 animate-pulse" : "text-[#00E5FF]")} />
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-normalst text-muted-foreground">Rest Timer</div>
              <div className={cn(
                "text-xl font-mono font-semibold tabular-nums",
                isEnding ? "text-red-500 animate-bounce" : "text-foreground"
              )}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <Button
              size="icon" variant="ghost"
              className="h-10 w-10 rounded-xl bg-accent/50 hover:bg-accent"
              onClick={() => {
                setTimeLeft(prev => Math.max(0, prev - 15));
              }}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              size="icon" variant="ghost"
              className="h-10 w-10 rounded-xl bg-accent/50 hover:bg-accent"
              onClick={() => {
                setTimeLeft(prev => prev + 15);
                setTotalTime(prev => prev + 15);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <div className="w-px h-8 bg-border mx-1" />
            <Button
              size="icon" variant="ghost"
              className="h-10 w-10 rounded-xl hover:bg-red-500 hover:text-white transition-colors"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
