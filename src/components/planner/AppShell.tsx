import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Calendar, Dumbbell, Brain, Sparkles, LogOut, User, Gamepad2, CalendarDays, BookText, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/lib/themes";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SwipeNav } from "@/components/SwipeNav";
import { useRank } from "@/lib/ranks2";
import { StreakBadge } from "@/components/academic/StreakBadge";

const NAV = [
  { to: "/", label: "Daily Planner", icon: Calendar, accent: "school" },
  { to: "/workouts", label: "Workouts", icon: Dumbbell, accent: "sports" },
  { to: "/tutor", label: "AI Tutor", icon: Brain, accent: "primary" },
  { to: "/tests", label: "Tests", icon: CalendarDays, accent: "school" },
  { to: "/vocab", label: "Vocab", icon: BookText, accent: "school" },
  { to: "/notes", label: "Notes", icon: NotebookPen, accent: "school" },
  { to: "/games", label: "Games", icon: Gamepad2, accent: "primary" },
] as const;

const accentColor = (a: string) =>
  a === "sports" ? "hsl(var(--sports))" : a === "primary" ? "hsl(var(--primary))" : "hsl(var(--school))";

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
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Top-left floating profile button */}
      <button
        onClick={() => navigate("/profile")}
        className="fixed top-3 left-3 z-40 h-10 w-10 rounded-full border-2 border-border bg-card shadow-lg hover:border-primary transition-colors overflow-hidden flex items-center justify-center text-xs font-bold"
        title="Open profile"
        aria-label="Open profile"
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          : <span className="text-foreground">{initials}</span>}
      </button>

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
        <nav className="px-3 flex-1 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )
              }
            >
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
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )
            }
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
            <User className="h-4 w-4" />
            <span className="font-medium">Profile</span>
          </NavLink>
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

      {/* Mobile top nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar/95 backdrop-blur border-t border-sidebar-border flex">
        {NAV.map((item) => (
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
                <span>{item.label.split(" ")[0]}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <main className="flex-1 min-w-0 pb-16 md:pb-0">
        <div className="fixed top-3 right-3 z-40 flex gap-2 items-center">
          <ThemeSwitcher />
          <button
            onClick={signOut}
            className="md:hidden h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center text-xs font-bold"
            aria-label="Sign out"
            title={displayName}
          >
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full" /> : initials}
          </button>
        </div>
        <SwipeNav>
          <Outlet />
        </SwipeNav>
      </main>
    </div>
  );
};