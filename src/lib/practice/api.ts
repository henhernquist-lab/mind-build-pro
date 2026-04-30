import { supabase } from "@/integrations/supabase/client";

export type PracticeQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  topic: string;
  explanation: string;
};

export type PracticeTest = {
  id: string;
  user_id: string;
  subject: string;
  topic: string | null;
  difficulty: "easy" | "medium" | "hard";
  total_questions: number;
  source: "ai" | "notes" | "recommended";
  source_note_id: string | null;
  questions: PracticeQuestion[];
  created_at: string;
};

export type AnswerRecord = {
  question_index: number;
  topic: string;
  selected_index: number | null;
  correct: boolean;
};

export type PracticeAttempt = {
  id: string;
  user_id: string;
  test_id: string;
  subject: string;
  score_pct: number;
  correct_count: number;
  total_count: number;
  duration_seconds: number;
  answers: AnswerRecord[];
  weak_topics: string[] | null;
  created_at: string;
};

export type SubjectWeakness = {
  id: string;
  user_id: string;
  subject: string;
  last_two_scores: number[];
  flagged_for_review: boolean;
  dismissed_at: string | null;
};

export async function generateTest(input: {
  subject: string;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
  count?: number;
  sourceText?: string;
}): Promise<PracticeQuestion[]> {
  const { data, error } = await supabase.functions.invoke("generate-practice-test", {
    body: input,
  });
  if (error) throw new Error(error.message);
  if (!data?.questions) throw new Error("No questions returned");
  return data.questions as PracticeQuestion[];
}

export async function saveTest(input: {
  user_id: string;
  subject: string;
  topic?: string | null;
  difficulty: "easy" | "medium" | "hard";
  source?: "ai" | "notes" | "recommended";
  source_note_id?: string | null;
  questions: PracticeQuestion[];
}): Promise<PracticeTest | null> {
  const { data } = await supabase
    .from("practice_tests")
    .insert({
      user_id: input.user_id,
      subject: input.subject,
      topic: input.topic ?? null,
      difficulty: input.difficulty,
      source: input.source ?? "ai",
      source_note_id: input.source_note_id ?? null,
      total_questions: input.questions.length,
      questions: input.questions as any,
    })
    .select()
    .single();
  return (data as any as PracticeTest) ?? null;
}

export async function listTests(userId: string): Promise<PracticeTest[]> {
  const { data } = await supabase
    .from("practice_tests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return ((data as any[]) ?? []) as PracticeTest[];
}

export async function deleteTest(id: string) {
  await supabase.from("practice_tests").delete().eq("id", id);
}

export async function recordAttempt(input: Omit<PracticeAttempt, "id" | "created_at">): Promise<PracticeAttempt | null> {
  const { data } = await supabase
    .from("practice_attempts")
    .insert(input as any)
    .select()
    .single();
  return (data as any as PracticeAttempt) ?? null;
}

export async function listAttempts(userId: string, subject?: string): Promise<PracticeAttempt[]> {
  let q = supabase.from("practice_attempts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (subject) q = q.eq("subject", subject);
  const { data } = await q;
  return ((data as any[]) ?? []) as PracticeAttempt[];
}

export async function getRecommendation(subject: string, scorePct: number, weakTopics: string[]): Promise<string | null> {
  try {
    const { data } = await supabase.functions.invoke("practice-recommendation", {
      body: { subject, scorePct, weakTopics },
    });
    return (data?.recommendation as string) ?? null;
  } catch {
    return null;
  }
}

/** Update the rolling subject weakness tracker. Returns true if user is now flagged (2+ in a row below 70). */
export async function updateSubjectWeakness(userId: string, subject: string, scorePct: number): Promise<boolean> {
  const { data: existing } = await supabase
    .from("subject_weakness")
    .select("*")
    .eq("user_id", userId)
    .eq("subject", subject)
    .maybeSingle();

  const prev: number[] = ((existing as any)?.last_two_scores as number[]) ?? [];
  const last_two_scores = [...prev, scorePct].slice(-2);
  const flagged = last_two_scores.length >= 2 && last_two_scores.every((s) => s < 70);

  if (existing) {
    const patch: any = { last_two_scores, flagged_for_review: flagged, updated_at: new Date().toISOString() };
    if (flagged && !((existing as any).flagged_for_review)) patch.dismissed_at = null;
    await supabase.from("subject_weakness").update(patch).eq("id", (existing as any).id);
  } else {
    await supabase.from("subject_weakness").insert({
      user_id: userId, subject, last_two_scores, flagged_for_review: flagged,
    });
  }
  return flagged;
}

export async function getFlaggedSubjects(userId: string): Promise<SubjectWeakness[]> {
  const { data } = await supabase
    .from("subject_weakness")
    .select("*")
    .eq("user_id", userId)
    .eq("flagged_for_review", true)
    .is("dismissed_at", null);
  return ((data as any[]) ?? []) as SubjectWeakness[];
}

export async function dismissFlag(id: string) {
  await supabase.from("subject_weakness").update({
    dismissed_at: new Date().toISOString(),
    flagged_for_review: false,
  }).eq("id", id);
}

/** Stash a one-shot prefill for the AI Tutor — Tutor page can read & clear later. */
export function setTutorPrefill(payload: { subject: string; topic?: string; reason?: string }) {
  try {
    sessionStorage.setItem("tutor:prefill", JSON.stringify(payload));
  } catch { /* ignore */ }
}