// Single source of truth for subjects: merge user-defined (Tutor's localStorage) + class schedule (academic_classes).
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { fetchClasses } from "@/lib/academic";

export type Subject = { id: string; label: string; emoji: string; color: string; description?: string; slug?: string; fromClass?: boolean };

const DEFAULT_SUBJECTS: Subject[] = [
  { id: "algebra", label: "Algebra 1", emoji: "🧮", color: "school" },
  { id: "langlit", label: "Lang & Lit", emoji: "📖", color: "school" },
  { id: "georgia", label: "Georgia Studies", emoji: "🍑", color: "sports" },
  { id: "science", label: "Phys Science", emoji: "⚗️", color: "free" },
  { id: "spanish", label: "Spanish", emoji: "🌎", color: "sports" },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32) || "class";

const guessEmoji = (name: string): string => {
  const n = name.toLowerCase();
  if (/algebra|geometry|calculus|math|trig/.test(n)) return "🧮";
  if (/lang|english|literature|writing|reading/.test(n)) return "📖";
  if (/georgia|history|government|civics|social/.test(n)) return "🏛️";
  if (/science|chem|physic|biology|bio/.test(n)) return "⚗️";
  if (/spanish|french|chinese|german/.test(n)) return "🌎";
  if (/art/.test(n)) return "🎨";
  if (/music|band|orchestra/.test(n)) return "🎵";
  if (/code|computer|programming/.test(n)) return "💻";
  if (/health|gym|pe|physical/.test(n)) return "💪";
  return "📚";
};

const guessColor = (name: string): string => {
  const n = name.toLowerCase();
  if (/math|algebra|geom|calc/.test(n)) return "school";
  if (/science|chem|physic|bio/.test(n)) return "free";
  if (/history|government|georgia|social|spanish|french/.test(n)) return "sports";
  return "school";
};

// Merge: defaults + saved (from localStorage if present) + class schedule
export const useSubjects = (savedJson?: string | null): Subject[] => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);

  const reload = useCallback(async () => {
    let base: Subject[] = DEFAULT_SUBJECTS;
    if (savedJson) {
      try {
        const parsed = JSON.parse(savedJson);
        if (Array.isArray(parsed) && parsed.length > 0) base = parsed;
      } catch {}
    }
    if (!user) { setSubjects(base); return; }
    const cls = await fetchClasses(user.id);
    const fromClasses: Subject[] = cls.map((c) => ({
      id: `class_${slug(c.class_name)}`,
      label: c.class_name,
      emoji: guessEmoji(c.class_name),
      color: guessColor(c.class_name),
      description: c.difficulty !== "Standard" ? `${c.difficulty} class` : undefined,
      fromClass: true,
    }));
    // Dedupe by lowercase label: class schedule wins over defaults
    const seen = new Set<string>();
    const merged: Subject[] = [];
    for (const s of [...fromClasses, ...base]) {
      const key = s.label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(s);
    }
    setSubjects(merged);
  }, [user, savedJson]);

  useEffect(() => { reload(); }, [reload]);

  // Listen for class-changed events fired by Profile page
  useEffect(() => {
    const handler = () => reload();
    window.addEventListener("classes-changed", handler);
    return () => window.removeEventListener("classes-changed", handler);
  }, [reload]);

  return subjects;
};

export const fireSubjectsChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("classes-changed"));
};

export { DEFAULT_SUBJECTS };
