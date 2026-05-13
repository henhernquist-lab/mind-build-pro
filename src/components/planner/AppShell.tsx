import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar, Dumbbell, Brain, Sparkles, LogOut, User,
  CalendarDays, BookText, NotebookPen, ChevronDown, Search, GraduationCap, Trophy, Apple, Utensils, Crown, ClipboardCheck, Heart,
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
import { SeasonCeremony } from "@/components/seasons/SeasonCeremony";
import { SeasonEndsBanner } from "@/components/seasons/SeasonEndsBanner";
import { FocusToggle } from "@/components/focus/FocusToggle";
import { claimDailyLoginXp } from "@/lib/streak";
import { showFloatingXp } from "@/components/fx/FloatingXp";
import { toast } from "sonner";
import { OfflineBanner, OnlineDot } from "@/components/offline/OfflineBanner";
import { NotificationBell } from "@/components/nav/NotificationBell";
import { AceAssistant } from "@/components/ace/AceAssistant";

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
      { to: "/recovery", label: "Recovery", icon: Heart, accent: "sports" },
      { to: "/nutrition", label: "Nutrition", icon: Apple, accent: "sports" },
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
    label: "Compete",
    icon: Trophy,
    items: [
      { to: "/leaderboard", label: "Leaderboard", icon: Trophy, accent: "primary" },
      { to: "/championship", label: "Championship", icon: Crown, accent: "primary" },
    ],
  },
];

// Mobile bottom nav — one entry per top-level swipeable tab
const MOBILE_NAV: NavItem[] = [
  { to: "/", label: "Planner", icon: Calendar, accent: "school" },
  { to: "/workouts", label: "Training", icon: Dumbbell, accent: "sports" },
  { to: "/recovery", label: "Recovery", icon: Heart, accent: "sports" },
  { to: "/tutor", label: "Academic", icon: Brain, accent: "primary" },
  { to: "/leaderboard", label: "Compete", icon: Trophy, accent: "primary" },
];

const accentColor = (a: string) =>
  a === "sports" ? "hsl(var(--sports))" : a === "primary" ? "hsl(var(--primary))" : "hsl(var(--school))";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group relative flex items-center gap-3 rounded-lg pl-3 pr-3 py-2 text-sm transition-colors duration-300",
    isActive ? "text-foreground" : "text-sidebar-foreground hover:text-foreground"
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
      <SeasonCeremony />
      <SeasonEndsBanner />
      <AceAssistant />

      {/* Top-left floating profile button */}
      <button
        onClick={() => navigate("/profile")}
        className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-3 z-40 h-10 w-10 rounded-full border-2 border-border bg-card shadow-lg hover:border-primary transition-colors flex items-center justify-center text-xs font-bold md:top-3"
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

      {/* Top-left floating notification bell */}
      <div className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-16 z-40 md:top-3">
        <NotificationBell />
      </div>

      <OfflineBanner />

      <aside className="relative hidden md:flex w-60 flex-col bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border grid-overlay">
        {/* Left accent line */}
        <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[hsl(var(--cyan))] via-[hsl(var(--neon))] to-transparent opacity-60 pointer-events-none" />
        <div className="p-5 pl-16 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[hsl(var(--cyan))] to-[hsl(var(--neon))] flex-shrink-0 shadow-[0_0_18px_hsl(var(--cyan)/0.45)]">
              <Sparkles className="h-5 w-5" style={{ color: "hsl(var(--background))" }} />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-display tracking-[0.08em] leading-none">LIFESTACK</div>
              <div className="text-[10px] text-muted-foreground truncate mt-1">{user?.email}</div>
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
                            {isActive && (
                              <motion.span
                                layoutId="sidebar-active-pill"
                                className="absolute inset-0 sidebar-pill-bg"
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                aria-hidden
                              />
                            )}
                            <span className="relative flex items-center gap-3 z-10 w-full">
                              <span
                                className="h-2 w-2 rounded-full transition-all"
                                style={{
                                  backgroundColor: accentColor(item.accent),
                                  boxShadow: isActive ? `0 0 12px ${accentColor(item.accent)}` : "none",
                                }}
                              />
                              <item.icon className={cn("h-4 w-4 transition-transform duration-200", isActive && "scale-110 drop-shadow-[0_0_6px_currentColor]")} />
                              <span className="font-medium">{item.label}</span>
                            </span>
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

      {/* Mobile bottom nav — frosted glass with sliding pill + haptic */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 mobile-nav-glass flex pb-[env(safe-area-inset-bottom)]">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={() => {
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                try { navigator.vibrate(20); } catch {}
              }
            }}
            className={({ isActive }) =>
              cn(
                "relative flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-stat transition-colors duration-300",
                isActive ? "text-foreground" : "text-muted-foreground"
              )
            }
            data-testid={`mobile-nav-${item.label.toLowerCase()}`}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    className="absolute top-1 left-1/2 -translate-x-1/2 h-[3px] w-10 rounded-full"
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    style={{
                      background: accentColor(item.accent),
                      boxShadow: `0 0 12px ${accentColor(item.accent)}`,
                    }}
                    aria-hidden
                  />
                )}
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    isActive && "scale-[1.15] drop-shadow-[0_0_8px_currentColor]"
                  )}
                  style={{ color: isActive ? accentColor(item.accent) : undefined }}
                />
                <span
                  className={cn(
                    "tracking-wider transition-all duration-300",
                    isActive ? "opacity-100 translate-y-0" : "opacity-70 translate-y-[1px]"
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <main className="flex-1 min-w-0 pt-[calc(env(safe-area-inset-top)+3.75rem)] pb-[calc(env(safe-area-inset-bottom)+5.25rem)] md:pt-0 md:pb-0">
        <div className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 z-40 flex gap-2 items-center md:top-3">
          <ThemeSwitcher />
          <FocusToggle />
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
