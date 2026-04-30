import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar, Dumbbell, Brain, Sparkles, LogOut, User, Gamepad2,
  CalendarDays, BookText, NotebookPen, ChevronDown, Search, GraduationCap, Trophy, Apple, Utensils, Crown, ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/lib/themes";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SwipeNav } from "@/components/SwipeNav";
import { PageTransition } from "@/components/transitions/PageTransition";
import { useRank } from "@/lib/ranks2";
import { StreakBadge } from "@/components/academic/StreakBadge";
import { CommandPalette, openCommandPalette } from "@/components/nav/CommandPalette";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { MobileFab } from "@/components/nav/MobileFab";
import { SubTabs } from "@/components/nav/SubTabs";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { FocusToggle } from "@/components/focus/FocusToggle";
import { claimDailyLoginXp } from "@/lib/streak";
import { showFloatingXp } from "@/components/fx/FloatingXp";
import { toast } from "sonner";
import { OfflineBanner, OnlineDot } from "@/components/offline/OfflineBanner";

type NavItem = { to: string; label: string; icon: any; accent: "school" | "sports" | "primary" };
type NavGroup = { id: string; label: string; icon: any; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    id: "planner",
    label: "Planner",
    icon: Calendar,
    items: [{ to: "/", label: "Daily Planner", icon: Calendar, accent: "school" }],
  },
  {
    id: "training",
    label: "Training",
    icon: Dumbbell,
    items: [
      { to: "/workouts", label: "Workouts", icon: Dumbbell, accent: "sports" },
      { to: "/nutrition", label: "Nutrition", icon: Apple, accent: "sports" },
      { to: "/recruitment", label: "Recruitment", icon: GraduationCap, accent: "sports" },
    ],
  },
  {
    id: "academic",
    label: "Academic",
    icon: GraduationCap,
    items: [
      { to: "/tutor", label: "AI Tutor", icon: Brain, accent: "primary" },
      { to: "/tests", label: "Tests", icon: CalendarDays, accent: "school" },
      { to: "/vocab", label: "Vocab", icon: BookText, accent: "school" },
      { to: "/notes", label: "Notes", icon: NotebookPen, accent: "school" },
      { to: "/practice", label: "Practice", icon: ClipboardCheck, accent: "school" },
    ],
  },
  {
    id: "arcade",
    label: "Arcade",
    icon: Gamepad2,
    items: [
      { to: "/games", label: "Games", icon: Gamepad2, accent: "primary" },
      { to: "/leaderboard", label: "Leaderboard", icon: Trophy, accent: "primary" },
      { to: "/championship", label: "Championship", icon: Crown, accent: "primary" },
    ],
  },
];

// Mobile bottom nav — one entry per top-level swipeable tab
const MOBILE_NAV: NavItem[] = [
  { to: "/", label: "Planner", icon: Calendar, accent: "school" },
  { to: "/workouts", label: "Training", icon: Dumbbell, accent: "sports" },
  { to: "/tutor", label: "Academic", icon: Brain, accent: "primary" },
  { to: "/games", label: "Arcade", icon: Gamepad2, accent: "primary" },
];

const accentColor = (a: string) =>
  a === "sports" ? "hsl(var(--sports))" : a === "primary" ? "hsl(var(--primary))" : "hsl(var(--school))";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
  );

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  useTheme();
  const { user, profile, signOut } = useAuth();
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "You";
  const initials = displayName.slice(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url;
  const athleticRank = useRank("athletic");
  const academicRank = useRank("academic");

  // Daily login bonus: +5 academic XP once per day, bumps streak.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const result = await claimDailyLoginXp(user.id);
      if (cancelled || !result) return;
      showFloatingXp(result.awarded, { color: "hsl(var(--primary))" });
      toast.success(`☀️ Daily login +${result.awarded} XP`, {
        description: result.streak > 1 ? `🔥 ${result.streak}-day streak` : "Welcome back!",
        duration: 4000,
      });
      academicRank.reload();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Group expand/collapse state — auto-expand the group containing current route
  const activeGroup = GROUPS.find((g) => g.items.some((i) => location.pathname === i.to || (i.to !== "/" && location.pathname.startsWith(i.to))))?.id;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    planner: true,
    training: true,
    academic: true,
    arcade: true,
  });
  const toggleGroup = (id: string) => setOpenGroups((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <CommandPalette />
      <MobileFab />
      <OnboardingFlow />

      {/* Top-left floating profile button */}
      <button
        onClick={() => navigate("/profile")}
        className="fixed top-3 left-3 z-40 h-10 w-10 rounded-full border-2 border-border bg-card shadow-lg hover:border-primary transition-colors flex items-center justify-center text-xs font-bold"
        title="Open profile"
        aria-label="Open profile"
      >
        <span className="relative h-full w-full rounded-full overflow-hidden flex items-center justify-center">
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            : <span className="text-foreground">{initials}</span>}
        </span>
        <OnlineDot className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background" />
      </button>

      <OfflineBanner />

      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="p-5 pl-16 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-school to-sports flex-shrink-0">
              <Sparkles className="h-5 w-5" style={{ color: "hsl(var(--background))" }} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">LifeStack</div>
              <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <StreakBadge />
        </div>

        {/* Cmd+K search trigger */}
        <button
          onClick={openCommandPalette}
          className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-sidebar-border bg-card/40 px-3 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Quick search...</span>
          <kbd className="ml-auto text-[10px] rounded bg-muted px-1.5 py-0.5 font-mono">⌘K</kbd>
        </button>

        <nav className="px-3 flex-1 space-y-2 overflow-y-auto">
          {GROUPS.map((g) => {
            const isOpen = openGroups[g.id];
            const isActiveGroup = activeGroup === g.id;
            return (
              <div key={g.id}>
                <button
                  onClick={() => toggleGroup(g.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wider transition-colors",
                    isActiveGroup ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <g.icon className="h-3 w-3" />
                  <span>{g.label}</span>
                  <ChevronDown
                    className={cn("h-3 w-3 ml-auto transition-transform", isOpen ? "" : "-rotate-90")}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-0.5 mt-1 animate-fade-in">
                    {g.items.map((item) => (
                      <NavLink key={item.to} to={item.to} end={item.to === "/"} className={navItemClass}>
                        {({ isActive }) => (
                          <>
                            <span
                              className="h-2 w-2 rounded-full transition-all"
                              style={{
                                backgroundColor: accentColor(item.accent),
                                boxShadow: isActive ? `0 0 12px ${accentColor(item.accent)}` : "none",
                              }}
                            />
                            <item.icon className="h-4 w-4" />
                            <span className="font-medium">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2 border-t border-sidebar-border/60">
            <NavLink to="/profile" className={navItemClass}>
              <span className="h-2 w-2 rounded-full bg-primary" />
              <User className="h-4 w-4" />
              <span className="font-medium">Profile</span>
            </NavLink>
          </div>
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="flex gap-2 px-1">
            <NavLink
              to="/profile"
              className="flex-1 rounded-lg border border-border bg-card/60 px-2 py-1.5 text-center hover:border-primary transition-colors"
              style={{ borderLeft: `3px solid ${athleticRank.rank.color}` }}
              title={`Athletic: ${athleticRank.rank.name} • ${athleticRank.xp} XP`}
            >
              <div className="text-base leading-none">{athleticRank.rank.icon}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{athleticRank.xp} XP</div>
            </NavLink>
            <NavLink
              to="/profile"
              className="flex-1 rounded-lg border border-border bg-card/60 px-2 py-1.5 text-center hover:border-primary transition-colors"
              style={{ borderLeft: `3px solid ${academicRank.rank.color}` }}
              title={`Academic: ${academicRank.rank.name} • ${academicRank.xp} XP`}
            >
              <div className="text-base leading-none">{academicRank.rank.icon}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{academicRank.xp} XP</div>
            </NavLink>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
          <div className="px-2 text-[11px] text-muted-foreground">Stack the days. Win the year.</div>
        </div>
      </aside>

      {/* Mobile bottom nav — trimmed to 4 items, FAB handles the rest */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur border-t border-sidebar-border flex">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px]",
                isActive ? "text-foreground" : "text-muted-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className="h-5 w-5"
                  style={{ color: isActive ? accentColor(item.accent) : undefined }}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="fixed top-3 right-3 z-40 flex gap-2 items-center">
          <ThemeSwitcher />
          <FocusToggle />
          <button
            onClick={signOut}
            className="md:hidden h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center text-xs font-bold"
            aria-label="Sign out"
            title={displayName}
          >
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full" /> : initials}
          </button>
        </div>
        <Breadcrumbs />
        <SwipeNav>
          <SubTabs />
          <PageTransition>
            <Outlet />
          </PageTransition>
        </SwipeNav>
      </main>
    </div>
  );
};
