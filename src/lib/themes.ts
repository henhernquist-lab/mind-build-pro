import { useEffect } from "react";
import { useLocalStorage } from "@/lib/storage";

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

export const useTheme = () => {
  const [theme, setTheme] = useLocalStorage<ThemeId>("app:theme", "midnight");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return { theme, setTheme };
};