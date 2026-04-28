import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, NotebookPen, Brain, Gamepad2, Search, X } from "lucide-react";
import { sfx } from "@/lib/sounds";
import { openCommandPalette } from "./CommandPalette";

const ACTIONS = [
  { icon: Search, label: "Search", run: () => openCommandPalette(), color: "hsl(var(--primary))" },
  { icon: NotebookPen, label: "Note", to: "/notes", color: "hsl(var(--school))" },
  { icon: Calendar, label: "Test", to: "/tests", color: "hsl(var(--sports))" },
  { icon: Brain, label: "Tutor", to: "/tutor", color: "hsl(var(--primary))" },
  { icon: Gamepad2, label: "Games", to: "/games", color: "hsl(var(--coding))" },
];

export const MobileFab = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="md:hidden fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {open && (
        <div className="flex flex-col gap-2 mb-1 animate-fade-in pointer-events-auto">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                setOpen(false);
                sfx.click();
                if (a.run) a.run();
                else if (a.to) navigate(a.to);
              }}
              className="flex items-center gap-2 bg-card border border-border shadow-lg rounded-full pl-3 pr-4 py-2 text-sm font-medium hover:scale-105 transition-transform"
              style={{ borderLeft: `3px solid ${a.color}` }}
            >
              <a.icon className="h-4 w-4" style={{ color: a.color }} />
              {a.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => { setOpen((o) => !o); sfx.click(); }}
        className="pointer-events-auto h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--school)))",
          color: "hsl(var(--background))",
        }}
        aria-label={open ? "Close menu" : "Open quick menu"}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
};
