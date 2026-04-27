import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeId = "midnight" | "neon" | "forest" | "solar" | "arctic";

export type Theme = {
  id: ThemeId;
  name: string;
  vibe: string;
  swatches: string[]; // hex preview swatches
};

export const THEMES: Theme[] = [
  {
    id: "midnight",
    name: "Midnight Pro",
    vibe: "Sleek dark tech",
    swatches: ["#0A0F1C", "#3B82F6", "#22C55E"],
  },
  {
    id: "neon",
    name: "Neon Arcade",
    vibe: "Cyberpunk gamer",
    swatches: ["#0D0D0D", "#FF00FF", "#00FFFF"],
  },
  {
    id: "forest",
    name: "Forest Focus",
    vibe: "Calm nature",
    swatches: ["#0F1A0F", "#4ADE80", "#86EFAC"],
  },
  {
    id: "solar",
    name: "Solar Flare",
    vibe: "Bold energy",
    swatches: ["#1A0A00", "#F97316", "#FBBF24"],
  },
  {
    id: "arctic",
    name: "Arctic Clean",
    vibe: "Minimal light",
    swatches: ["#F8FAFC", "#0EA5E9", "#0F172A"],
  },
];

const KEY = "app:theme";
const VALID: ThemeId[] = ["midnight", "neon", "forest", "solar", "arctic"];
const isValid = (v: string | null): v is ThemeId => !!v && (VALID as string[]).includes(v);

const readLocal = (): ThemeId => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return "midnight";
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : "midnight";
  } catch {
    return "midnight";
  }
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<ThemeId>(readLocal);

  // Apply to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEY, JSON.stringify(theme)); } catch {}
  }, [theme]);

  // Pull from DB on mount if signed in
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("user_preferences")
        .select("theme")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.theme && isValid(data.theme)) {
        setThemeState(data.theme);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    // Fire-and-forget DB sync
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_preferences").upsert({ user_id: user.id, theme: t });
    })();
  };

  return { theme, setTheme };
};