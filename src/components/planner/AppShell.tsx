import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Calendar, BookOpen, Dumbbell, Brain, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/lib/themes";

const NAV = [
  { to: "/", label: "Daily Planner", icon: Calendar, accent: "school" },
  { to: "/homework", label: "Homework", icon: BookOpen, accent: "school" },
  { to: "/workouts", label: "Workouts", icon: Dumbbell, accent: "sports" },
  { to: "/tutor", label: "AI Tutor", icon: Brain, accent: "coding" },
] as const;

const accentColor = (a: string) =>
  a === "sports" ? "hsl(var(--sports))" : a === "coding" ? "hsl(var(--coding))" : "hsl(var(--school))";

export const AppShell = () => {
  const location = useLocation();
  // Initialize theme on mount
  useTheme();
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="p-5 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-school to-coding">
            <Sparkles className="h-5 w-5 text-background" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">LifeStack</div>
            <div className="text-[11px] text-muted-foreground">8th grade · athlete · coder</div>
          </div>
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
        </nav>
        <div className="p-4 text-[11px] text-muted-foreground border-t border-sidebar-border">
          Stack the days. Win the year.
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
        <div className="fixed top-3 right-3 z-40">
          <ThemeSwitcher />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};