import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Section = { to: string; label: string; members: string[] };

// 4 top-level swipeable tabs. `members` are all routes that belong to the tab —
// swiping from any member navigates to the next tab's root.
const SECTIONS: Section[] = [
  { to: "/", label: "Planner", members: ["/"] },
  { to: "/workouts", label: "Training", members: ["/workouts", "/nutrition", "/macros"] },
  { to: "/tutor", label: "Academic", members: ["/tutor", "/tests", "/vocab", "/notes"] },
  { to: "/games", label: "Arcade", members: ["/games", "/leaderboard"] },
];

const HINT_KEY = "swipe_hint_shown_v1";

export const SwipeNav = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showHint, setShowHint] = useState(false);

  const idx = SECTIONS.findIndex((s) =>
    s.members.some((m) => location.pathname === m || (m !== "/" && location.pathname.startsWith(m)))
  );
  const currentIdx = idx === -1 ? 0 : idx;

  const goTo = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= SECTIONS.length) return;
    setDirection(newIdx > currentIdx ? 1 : -1);
    navigate(SECTIONS[newIdx].to);
  };

  // First-load swipe hint
  useEffect(() => {
    if (!isMobile) return;
    if (localStorage.getItem(HINT_KEY)) return;
    setShowHint(true);
    const t = setTimeout(() => {
      setShowHint(false);
      localStorage.setItem(HINT_KEY, "1");
    }, 3000);
    return () => clearTimeout(t);
  }, [isMobile]);

  // Touch handling
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    const dt = Date.now() - start.current.t;
    start.current = null;
    // Must be more horizontal than vertical, > 50px, < 400ms
    if (Math.abs(dx) < 50 || dt > 400) return;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (showHint) {
      setShowHint(false);
      localStorage.setItem(HINT_KEY, "1");
    }
    if (dx < 0) goTo(currentIdx + 1);
    else goTo(currentIdx - 1);
  };

  // Keyboard nav (desktop)
  useEffect(() => {
    if (isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowRight") goTo(currentIdx + 1);
      else if (e.key === "ArrowLeft") goTo(currentIdx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile, currentIdx]);

  return (
    <div
      className="relative h-full w-full overflow-x-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={isMobile ? { x: direction * 80, opacity: 0 } : { opacity: 0, y: 8 }}
          animate={isMobile ? { x: 0, opacity: 1 } : { opacity: 1, y: 0 }}
          exit={isMobile ? { x: direction * -80, opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: isMobile ? 0.3 : 0.22, ease: "easeInOut" }}
          className="h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Mobile dot indicators */}
      {isMobile && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex gap-2 bg-card/80 backdrop-blur rounded-full px-3 py-1.5 border border-border">
          {SECTIONS.map((s, i) => (
            <button
              key={s.to}
              onClick={() => goTo(i)}
              aria-label={`Go to ${s.label}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === currentIdx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40"
              )}
            />
          ))}
        </div>
      )}

      {/* First-load swipe hint */}
      <AnimatePresence>
        {showHint && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: [20, 0, 20] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: 1 }}
              className="fixed top-1/2 right-2 -translate-y-1/2 z-40 pointer-events-none"
            >
              <div className="rounded-full bg-primary/20 border border-primary/40 p-2 backdrop-blur">
                <ChevronLeft className="h-5 w-5 text-primary" />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none mt-20"
            >
              <div className="text-xs bg-card/90 border border-border rounded-full px-3 py-1.5 backdrop-blur shadow-lg">
                Swipe to switch sections
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};