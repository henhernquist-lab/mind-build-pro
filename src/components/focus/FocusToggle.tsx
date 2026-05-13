// Header button that opens Focus Mode + auto-suggest banner when a planner study block is active.
import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { FocusMode, useFocusMode } from "./FocusMode";
import { sfx } from "@/lib/sounds";

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export const FocusToggle = () => {
  const { user } = useAuth();
  const { open, setOpen } = useFocusMode();
  const [activeBlock, setActiveBlock] = useState<{ label: string } | null>(null);
  const [autoSuggested, setAutoSuggested] = useState(false);

  // Poll planner_blocks for current study block
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from("planner_blocks")
        .select("label, start_time, end_time, category")
        .eq("user_id", user.id)
        .eq("date", todayISO());
      if (cancelled) return;
      const now = nowMin();
      const found = (data ?? []).find((b: any) =>
        b.category === "school" && now >= toMin(b.start_time) && now < toMin(b.end_time)
      );
      setActiveBlock(found ?? null);
      // Auto-open once per session if a study block just started
      if (found && !open && !autoSuggested && sessionStorage.getItem("focus-auto-shown") !== "1") {
        sessionStorage.setItem("focus-auto-shown", "1");
        setAutoSuggested(true);
      }
    };
    check();
    const t = window.setInterval(check, 60_000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [user, open, autoSuggested]);

  return (
    <>
      <button
        onClick={() => { setOpen(true); sfx.click(); }}
        className="h-9 px-3 rounded-full bg-card border border-border flex items-center gap-1.5 text-xs font-bold hover:border-primary transition-colors"
        title="Enter Focus Mode"
      >
        <Brain className="h-3.5 w-3.5 text-primary" />
        <span className="hidden sm:inline">Focus</span>
      </button>

      {/* Auto-suggest banner */}
      {autoSuggested && activeBlock && !open && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="rounded-full bg-card border-2 border-primary shadow-2xl px-4 py-2 flex items-center gap-3 text-sm">
            <Brain className="h-4 w-4 text-primary" />
            <span>Study block: <span className="font-bold">{activeBlock.label}</span></span>
            <button
              onClick={() => { setOpen(true); setAutoSuggested(false); }}
              className="text-xs uppercase tracking-wider font-bold text-primary hover:underline"
            >
              Enter Focus
            </button>
            <button
              onClick={() => setAutoSuggested(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <FocusMode open={open} onClose={() => setOpen(false)} />
    </>
  );
};
