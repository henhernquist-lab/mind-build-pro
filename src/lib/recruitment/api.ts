import { supabase } from "@/integrations/supabase/client";

export type CollegeStatus =
  | "interested" | "contacted" | "applied" | "offered" | "committed" | "rejected";

export type College = {
  id: string;
  user_id: string;
  name: string;
  division: string | null;
  sport: string | null;
  location: string | null;
  website: string | null;
  notes: string | null;
  status: CollegeStatus;
  priority: number;
  created_at: string;
  updated_at: string;
  academic_avg_gpa: number | null;
  sat_min: number | null;
  act_min: number | null;
  athletic_level: string | null;
  key_stat_targets: any | null;
  match_score: number | null;
  match_breakdown: any | null;
  match_summary: string | null;
  computed_at: string | null;
  response_status: string | null;
};

export type RecruitmentContact = {
  id: string;
  user_id: string;
  college_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  last_contacted: string | null;
};

export type RecruitmentTask = {
  id: string;
  user_id: string;
  college_id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
};

export type MilestoneType =
  | "note" | "email" | "call" | "visit" | "offer"
  | "application" | "commitment" | "rejection";

export type RecruitmentMilestone = {
  id: string;
  user_id: string;
  college_id: string;
  event_type: MilestoneType;
  title: string;
  description: string | null;
  occurred_on: string;
  created_at: string;
};

export const STATUSES: { value: CollegeStatus; label: string; color: string }[] = [
  { value: "interested", label: "Interested", color: "hsl(var(--muted-foreground))" },
  { value: "contacted", label: "Contacted", color: "hsl(var(--primary))" },
  { value: "applied", label: "Applied", color: "hsl(var(--school))" },
  { value: "offered", label: "Offered", color: "hsl(var(--sports))" },
  { value: "committed", label: "Committed", color: "#10b981" },
  { value: "rejected", label: "Rejected", color: "#ef4444" },
];

// Colleges
export async function listColleges(userId: string): Promise<College[]> {
  const { data } = await supabase
    .from("colleges")
    .select("*")
    .eq("user_id", userId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });
  return (data as College[]) ?? [];
}

export async function createCollege(input: Partial<College> & { user_id: string; name: string }): Promise<College | null> {
  const { data } = await supabase.from("colleges").insert(input).select().single();
  return (data as College) ?? null;
}

export async function updateCollege(id: string, patch: Partial<College>) {
  await supabase.from("colleges").update(patch).eq("id", id);
}

export async function deleteCollege(id: string) {
  await supabase.from("colleges").delete().eq("id", id);
}

// Contacts
export async function listContacts(collegeId: string): Promise<RecruitmentContact[]> {
  const { data } = await supabase
    .from("recruitment_contacts")
    .select("*")
    .eq("college_id", collegeId)
    .order("created_at", { ascending: false });
  return (data as RecruitmentContact[]) ?? [];
}

export async function createContact(input: Omit<RecruitmentContact, "id">) {
  const { data } = await supabase.from("recruitment_contacts").insert(input).select().single();
  return data as RecruitmentContact;
}

export async function updateContact(id: string, patch: Partial<RecruitmentContact>) {
  await supabase.from("recruitment_contacts").update(patch).eq("id", id);
}

export async function deleteContact(id: string) {
  await supabase.from("recruitment_contacts").delete().eq("id", id);
}

// Tasks
export async function listTasksForCollege(collegeId: string): Promise<RecruitmentTask[]> {
  const { data } = await supabase
    .from("recruitment_tasks")
    .select("*")
    .eq("college_id", collegeId)
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });
  return (data as RecruitmentTask[]) ?? [];
}

export async function listAllOpenTasks(userId: string): Promise<(RecruitmentTask & { college_name: string })[]> {
  const { data } = await supabase
    .from("recruitment_tasks")
    .select("*, colleges!inner(name)")
    .eq("user_id", userId)
    .eq("completed", false)
    .order("due_date", { ascending: true, nullsFirst: false });
  return ((data as any[]) ?? []).map((t) => ({ ...t, college_name: t.colleges?.name ?? "" }));
}

export async function createTask(input: Omit<RecruitmentTask, "id" | "completed_at">) {
  const { data } = await supabase.from("recruitment_tasks").insert(input).select().single();
  return data as RecruitmentTask;
}

export async function toggleTask(id: string, completed: boolean) {
  await supabase
    .from("recruitment_tasks")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);
}

export async function deleteTask(id: string) {
  await supabase.from("recruitment_tasks").delete().eq("id", id);
}

// Milestones
export async function listMilestones(collegeId: string): Promise<RecruitmentMilestone[]> {
  const { data } = await supabase
    .from("recruitment_milestones")
    .select("*")
    .eq("college_id", collegeId)
    .order("occurred_on", { ascending: false });
  return (data as RecruitmentMilestone[]) ?? [];
}

export async function createMilestone(input: Omit<RecruitmentMilestone, "id" | "created_at">) {
  const { data } = await supabase.from("recruitment_milestones").insert(input).select().single();
  return data as RecruitmentMilestone;
}

export async function deleteMilestone(id: string) {
  await supabase.from("recruitment_milestones").delete().eq("id", id);
}