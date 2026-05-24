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
    swatches: ["#080C10", "#0D1520", "#00E5FF"],
  },
  {
    id: "neon",
    name: "Neon Arcade",
    vibe: "Cyberpunk gamer",
    swatches: ["#0D0D0D", "#FF00FF", "#00FFFF"],
  },
  {
    id: "forest",
    name: "Deep Focus",
    vibe: "Blue-black focus",
    swatches: ["#080C10", "#0D1520", "#00E5FF"],
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
const HUE_KEY = "app:accentHue";
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

const readLocalHue = (): number | null => {
  try {
    const raw = localStorage.getItem(HUE_KEY);
    if (!raw) return null;
    const n = Number(JSON.parse(raw));
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

const STYLE_ID = "lov-accent-override";
const applyAccentHue = (hue: number | null) => {
  if (typeof document === "undefined") return;
  let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }
  // Keep LifeStack on the approved cyan accent so stale saved hues cannot tint the app green.
  tag.textContent = `:root, [data-theme] {
    --primary: 186 100% 50% !important;
    --ring: 186 100% 50% !important;
    --sidebar-primary: 186 100% 50% !important;
    --sidebar-ring: 186 100% 50% !important;
    --accent: 186 100% 50% !important;
    --neon: 186 100% 50% !important;
    --cyan: 186 100% 50% !important;
  }`;
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<ThemeId>(readLocal);
  const [accentHue, setAccentHueState] = useState<number | null>(readLocalHue);

  // Apply to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEY, JSON.stringify(theme)); } catch {}
  }, [theme]);

  // Apply accent override
  useEffect(() => {
    applyAccentHue(accentHue);
    try {
      if (accentHue == null) localStorage.removeItem(HUE_KEY);
      else localStorage.setItem(HUE_KEY, JSON.stringify(accentHue));
    } catch {}
  }, [accentHue]);

  // Pull from DB on mount if signed in
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("user_preferences")
        .select("theme, accent_hue")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.theme && isValid(data.theme)) {
        setThemeState(data.theme);
      }
      if (data && (data as any).accent_hue !== undefined) {
        const h = (data as any).accent_hue;
        setAccentHueState(h == null ? null : Number(h));
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

  const setAccentHue = (h: number | null) => {
    setAccentHueState(h);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_preferences").upsert({ user_id: user.id, accent_hue: h });
    })();
  };

  return { theme, setTheme, accentHue, setAccentHue };
};