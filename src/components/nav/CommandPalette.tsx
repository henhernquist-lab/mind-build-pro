import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Calendar, Dumbbell, Brain, User, CalendarDays,
  BookText, NotebookPen, Trophy, Crown,
  Plus, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { sfx } from "@/lib/sounds";

const ROUTES = [
  { group: "Plan", items: [
    { label: "Daily Planner", to: "/", icon: Calendar, hint: "today" },
    { label: "Profile", to: "/profile", icon: User, hint: "me" },
  ]},
  { group: "Athletic", items: [
    { label: "Workouts", to: "/workouts", icon: Dumbbell },
  ]},
  { group: "Academic", items: [
    { label: "AI Tutor", to: "/tutor", icon: Brain },
    { label: "Test Calendar", to: "/tests", icon: CalendarDays },
    { label: "Vocab Builder", to: "/vocab", icon: BookText },
    { label: "Notes", to: "/notes", icon: NotebookPen },
  ]},
  { group: "Compete", items: [
    { label: "Leaderboard", to: "/leaderboard", icon: Trophy },
    { label: "Championship", to: "/championship", icon: Crown },
  ]},
];

const QUICK_ACTIONS = [
  { label: "New Note", to: "/notes", icon: NotebookPen, hint: "create" },
  { label: "Add Test", to: "/tests", icon: Plus, hint: "create" },
  { label: "Start Vocab Review", to: "/vocab", icon: Plus, hint: "review" },
];

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
        sfx.click();
      }
    };
    document.addEventListener("keydown", onKey);
    (window as any).__openCommandPalette = () => setOpen(true);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type to jump anywhere..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map((a) => (
            <CommandItem key={a.label} onSelect={() => go(a.to)}>
              <a.icon className="mr-2 h-4 w-4 text-primary" />
              <span>{a.label}</span>
              {a.hint && <span className="ml-auto text-xs text-muted-foreground">{a.hint}</span>}
            </CommandItem>
          ))}
        </CommandGroup>
        {ROUTES.map((g) => (
          <div key={g.group}>
            <CommandSeparator />
            <CommandGroup heading={g.group}>
              {g.items.map((it) => (
                <CommandItem key={it.to} onSelect={() => go(it.to)}>
                  <it.icon className="mr-2 h-4 w-4" />
                  <span>{it.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => { setOpen(false); signOut(); }}>
            <LogOut className="mr-2 h-4 w-4 text-destructive" />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export const openCommandPalette = () => (window as any).__openCommandPalette?.();
