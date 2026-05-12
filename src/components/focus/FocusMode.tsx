// Distraction-free study mode. Hides chrome, gives a Pomodoro timer + scratchpad.
// Activated manually via header button OR auto-detected when the current time
// falls inside a planner study block (category=school).
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Play, Pause, RotateCcw, Save, Brain, Coffee } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { sfx } from "@/lib/sounds";
import { toast } from "sonner";
import { useRank } from "@/lib/ranks2";

type Mode = "focus" | "break";
const FOCUS_MIN = 25;
const BREAK_MIN = 5;
const SESSION_KEY = "lifestack-focus-open";

export const useFocusMode = () => {
  const [open, setOpen] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  useEffect(() => {
    if (open) sessionStorage.setItem(SESSION_KEY, "1");
    else sessionStorage.removeItem(SESSION_KEY);
  }, [open]);
  return { open, setOpen };
};

export const FocusMode = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  const academic = useRank("academic");
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MIN * 60);
  const [running, setRunning] = useState(false);
  const [scratch, setScratch] = useState(() => localStorage.getItem("focus-scratch") || "");
  const [completed, setCompleted] = useState(0);
  const tickRef = useRef<number | null>(null);

  // Tick
  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(tickRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [running]);

  // On 0 → switch mode + reward
  useEffect(() => {
    if (secondsLeft !== 0) return;
    setRunning(false);
    sfx.rankUp();
    if (mode === "focus") {
      setCompleted((c) => c + 1);
      academic.addXp(10);
      toast.success("🎯 Focus session complete!", { description: "+10 academic XP. Take a break.", duration: 6000 });
      setMode("break");
      setSecondsLeft(BREAK_MIN * 60);
    } else {
      toast("☕ Break over. Back to it.", { duration: 4000 });
      setMode("focus");
      setSecondsLeft(FOCUS_MIN * 60);
    }
  }, [secondsLeft]);

  // Persist scratchpad locally
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem("focus-scratch", scratch), 500);
    return () => clearTimeout(t);
  }, [scratch]);

  // ESC to close (only when not running)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !running) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, running, onClose]);

  const reset = () => {
    setRunning(false);
    setSecondsLeft(mode === "focus" ? FOCUS_MIN * 60 : BREAK_MIN * 60);
  };

  const saveAsNote = async () => {
    if (!user || !scratch.trim()) { toast.error("Scratchpad is empty"); return; }
    await supabase.from("study_notes").insert({
      user_id: user.id,
      subject: "Focus Session",
      title: `Focus notes — ${new Date().toLocaleDateString()}`,
      content: scratch,
    });
    sfx.correct();
    toast.success("Saved to Notes");
  };

  if (!open) return null;

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");
  const total = (mode === "focus" ? FOCUS_MIN : BREAK_MIN) * 60;
  const pct = ((total - secondsLeft) / total) * 100;
  const accent = mode === "focus" ? "hsl(var(--primary))" : "hsl(var(--sports))";

  return (
    <div className="fixed inset-0 z-[200] bg-background/98 backdrop-blur-xl animate-fade-in flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: `${accent}20`, border: `1px solid ${accent}60` }}
          >
            {mode === "focus" ? <Brain className="h-4 w-4" style={{ color: accent }} /> : <Coffee className="h-4 w-4" style={{ color: accent }} />}
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-normalr">{mode === "focus" ? "Focus Session" : "Break"}</div>
            <div className="text-xs text-muted-foreground">{completed} session{completed === 1 ? "" : "s"} done today</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" /> Exit Focus
        </Button>
      </div>

      {/* Floating timer top-right */}
      <div className="fixed top-20 right-6 z-[201]">
        <div
          className="rounded-2xl border-2 px-5 py-3 shadow-2xl text-right"
          style={{ borderColor: accent, background: "hsl(var(--card))" }}
        >
          <div className="text-[10px] uppercase tracking-normalst text-muted-foreground">{mode === "focus" ? "Focus" : "Break"}</div>
          <div className="text-xl font-semibold font-mono tabular-nums" style={{ color: accent }}>
            {mins}:{secs}
          </div>
        </div>
      </div>

      {/* Main canvas */}
      <div className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-6 mt-4">
          {/* Big timer */}
          <div className="text-center space-y-3">
            <div className="text-6xl md:text-6xl font-semibold font-mono tabular-nums">
              {mins}:{secs}
            </div>
            <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-1000"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, hsl(var(--primary)))` }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button onClick={() => { setRunning((r) => !r); sfx.click(); }} size="lg" className="press">
                {running ? <><Pause className="h-4 w-4 mr-1" /> Pause</> : <><Play className="h-4 w-4 mr-1" /> Start</>}
              </Button>
              <Button onClick={reset} variant="outline" size="lg" className="press">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Scratchpad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-normalr text-muted-foreground">Scratchpad</label>
              <Button size="sm" variant="ghost" onClick={saveAsNote}>
                <Save className="h-3 w-3 mr-1" /> Save to Notes
              </Button>
            </div>
            <Textarea
              value={scratch}
              onChange={(e) => setScratch(e.target.value)}
              placeholder="Write notes, work problems, draft answers... Auto-saved locally."
              rows={14}
              className="font-mono text-sm bg-card/40 resize-none"
              autoFocus
            />
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">ESC</kbd> to exit (when timer is paused).
            Need help? Open the AI Tutor — but stay focused.
          </div>
        </div>
      </div>
    </div>
  );
};
