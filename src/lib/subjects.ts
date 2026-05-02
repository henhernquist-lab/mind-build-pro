// Single source of truth for AI Tutor subjects: the user's class schedule
// in the Academic Profile (`academic_classes` table). No hardcoded defaults.
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { fetchClasses, type AcademicClass } from "@/lib/academic";

export type Subject = {
  id: string;            // stable id derived from class id
  label: string;         // class_name
  emoji: string;
  color: string;
  description?: string;
  slug?: string;
  fromClass: true;
  classInfo: AcademicClass;
};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32) || "class";

const guessEmoji = (name: string): string => {
  const n = name.toLowerCase();
  if (/algebra|geometry|calculus|math|trig|stat/.test(n)) return "🧮";
  if (/lang|english|literature|writing|reading/.test(n)) return "📖";
  if (/history|government|civics|social|geography|world/.test(n)) return "🏛️";
  if (/chem/.test(n)) return "⚗️";
  if (/physic/.test(n)) return "🔭";
  if (/bio/.test(n)) return "🧬";
  if (/science/.test(n)) return "🔬";
  if (/spanish|french|chinese|german|latin|japanese/.test(n)) return "🌎";
  if (/art|draw|paint/.test(n)) return "🎨";
  if (/music|band|orchestra|choir/.test(n)) return "🎵";
  if (/code|computer|programming|cs/.test(n)) return "💻";
  if (/health|gym|pe|physical/.test(n)) return "💪";
  if (/econ|business|finance/.test(n)) return "💼";
  if (/psych/.test(n)) return "🧠";
  return "📚";
};

const guessColor = (name: string): string => {
  const n = name.toLowerCase();
  if (/math|algebra|geom|calc|stat/.test(n)) return "school";
  if (/science|chem|physic|bio/.test(n)) return "free";
  if (/history|government|social|spanish|french|geography|world/.test(n)) return "sports";
  return "school";
};

const toSubject = (c: AcademicClass): Subject => ({
  id: `class_${c.id}`,
  label: c.class_name,
  emoji: guessEmoji(c.class_name),
  color: guessColor(c.class_name),
  description: c.difficulty !== "Standard" ? `${c.difficulty}${c.teacher ? ` • ${c.teacher}` : ""}` : (c.teacher || undefined),
  slug: slug(c.class_name),
  fromClass: true,
  classInfo: c,
});

/** Subjects come exclusively from the user's classes in their Academic Profile. */
const useSubjectsCore = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!user) { setSubjects([]); setLoaded(true); return; }
    const cls = await fetchClasses(user.id);
    setSubjects(cls.map(toSubject));
    setLoaded(true);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const handler = () => reload();
    window.addEventListener("classes-changed", handler);
    return () => window.removeEventListener("classes-changed", handler);
  }, [reload]);

  return { subjects, loaded, reload };
};

/** Backwards-compatible: returns just the subject list. */
export const useSubjects = (): Subject[] => useSubjectsCore().subjects;

/** Full state: list + loaded flag + manual reload. Used by AI Tutor. */
export const useSubjectsState = useSubjectsCore;

export const fireSubjectsChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("classes-changed"));
};
