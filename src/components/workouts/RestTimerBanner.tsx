import { useState, useEffect } from "react";
import { Timer, X, Check } from "lucide-react";
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

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = (timeLeft / duration) * 100;

  return (
    <AnimatePresence>
      {timeLeft > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-50"
        >
          <div className="bg-[#00E5FF] text-black rounded-2xl p-4 shadow-[0_0_30px_rgba(0,229,255,0.4)] flex items-center justify-between relative overflow-hidden">
            <div
              className="absolute bottom-0 left-0 h-1 bg-black/20 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-black/10 flex items-center justify-center animate-pulse">
                <Timer className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest font-black opacity-70">Rest Timer</div>
                <div className="text-2xl font-mono font-black">{formatTime(timeLeft)}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-10 w-10 p-0 hover:bg-black/10 rounded-full"
                onClick={() => setTimeLeft(prev => prev + 30)}
              >
                +30s
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-10 w-10 p-0 hover:bg-black/10 rounded-full"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
