// Academic profile + classes + ranks data layer.
import { supabase } from "@/integrations/supabase/client";

export type AcademicProfile = {
  grade_level: string | null;
  gpa: number | null;
  gpa_weighted: boolean;
  strongest_subject: string | null;
  strongest_subject_override: boolean;
  needs_improvement: string | null;
  needs_improvement_override: boolean;
  academic_goals: string[];
  study_style: string | null;
  study_hours_per_day: number;
  homework_load: string | null;
};

export type AcademicClass = {
  id: string;
  class_name: string;
  period: string | null;
  teacher: string | null;
  current_grade: string | null;
  current_grade_pct: number | null;
  difficulty: string;
  sort_order: number;
};

export const STUDY_STYLES = [
  "Visual Learner",
  "Auditory Learner",
  "Reading/Writing",
  "Hands-On / Kinesthetic",
] as const;

export const ACADEMIC_GOAL_OPTIONS = [
  "Raise GPA",
  "Make Honor Roll",
  "Get into AP Classes",
  "Graduate Early",
  "Get a Scholarship",
  "Go to College",
  "Study Abroad",
] as const;

export const HOMEWORK_LOADS = ["Light", "Moderate", "Heavy", "Overwhelming"] as const;
export const DIFFICULTIES = ["Standard", "Honors", "AP", "IB", "Dual Enrollment"] as const;
export const LETTER_GRADES = ["A", "B", "C", "D", "F"] as const;

export const fetchAcademicProfile = async (userId: string): Promise<AcademicProfile | null> => {
  const { data } = await supabase
    .from("academic_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    grade_level: data.grade_level,
    gpa: data.gpa != null ? Number(data.gpa) : null,
    gpa_weighted: !!data.gpa_weighted,
    strongest_subject: data.strongest_subject,
    strongest_subject_override: !!data.strongest_subject_override,
    needs_improvement: data.needs_improvement,
    needs_improvement_override: !!data.needs_improvement_override,
    academic_goals: data.academic_goals ?? [],
    study_style: data.study_style,
    study_hours_per_day: Number(data.study_hours_per_day ?? 1),
    homework_load: data.homework_load,
  };
};

export const saveAcademicProfile = async (userId: string, p: AcademicProfile) => {
  const { error } = await supabase.from("academic_profile").upsert({
    user_id: userId,
    grade_level: p.grade_level,
    gpa: p.gpa,
    gpa_weighted: p.gpa_weighted,
    strongest_subject: p.strongest_subject,
    strongest_subject_override: p.strongest_subject_override,
    needs_improvement: p.needs_improvement,
    needs_improvement_override: p.needs_improvement_override,
    academic_goals: p.academic_goals,
    study_style: p.study_style,
    study_hours_per_day: p.study_hours_per_day,
    homework_load: p.homework_load,
  });
  if (error) throw error;
};

export const fetchClasses = async (userId: string): Promise<AcademicClass[]> => {
  const { data } = await supabase
    .from("academic_classes")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    class_name: r.class_name,
    period: r.period,
    teacher: r.teacher,
    current_grade: r.current_grade,
    current_grade_pct: r.current_grade_pct != null ? Number(r.current_grade_pct) : null,
    difficulty: r.difficulty,
    sort_order: r.sort_order,
  }));
};

export const insertClass = async (userId: string, c: Omit<AcademicClass, "id">) => {
  const { data, error } = await supabase
    .from("academic_classes")
    .insert({
      user_id: userId,
      class_name: c.class_name,
      period: c.period,
      teacher: c.teacher,
      current_grade: c.current_grade,
      current_grade_pct: c.current_grade_pct,
      difficulty: c.difficulty,
      sort_order: c.sort_order,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateClass = async (id: string, patch: Partial<AcademicClass>) => {
  const upd: any = {};
  if (patch.class_name !== undefined) upd.class_name = patch.class_name;
  if (patch.period !== undefined) upd.period = patch.period;
  if (patch.teacher !== undefined) upd.teacher = patch.teacher;
  if (patch.current_grade !== undefined) upd.current_grade = patch.current_grade;
  if (patch.current_grade_pct !== undefined) upd.current_grade_pct = patch.current_grade_pct;
  if (patch.difficulty !== undefined) upd.difficulty = patch.difficulty;
  if (patch.sort_order !== undefined) upd.sort_order = patch.sort_order;
  const { error } = await supabase.from("academic_classes").update(upd).eq("id", id);
  if (error) throw error;
};

export const deleteClass = async (id: string) => {
  const { error } = await supabase.from("academic_classes").delete().eq("id", id);
  if (error) throw error;
};

// Auto-calculate strongest/weakest subject from grades
const GRADE_RANK: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
export const computeStrongest = (classes: AcademicClass[]): string | null => {
  let best: AcademicClass | null = null;
  for (const c of classes) {
    if (!c.current_grade) continue;
    if (!best || (GRADE_RANK[c.current_grade] ?? -1) > (GRADE_RANK[best.current_grade ?? "F"] ?? -1)) {
      best = c;
    }
  }
  return best?.class_name ?? null;
};
export const computeWeakest = (classes: AcademicClass[]): string | null => {
  let worst: AcademicClass | null = null;
  for (const c of classes) {
    if (!c.current_grade) continue;
    if (!worst || (GRADE_RANK[c.current_grade] ?? 99) < (GRADE_RANK[worst.current_grade ?? "A"] ?? 99)) {
      worst = c;
    }
  }
  return worst?.class_name ?? null;
};