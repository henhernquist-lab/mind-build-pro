import { supabase } from "@/integrations/supabase/client";

export type PersonalInfo = {
  display_name: string;
  bio: string;
  grade: string;
  school_name: string;
  username: string;
  avatar_url: string | null;
};

export type AthleticInfo = {
  age: number;
  height_ft: number;
  height_in: number;
  weight_lbs: number;
  gender: "male" | "female";
  primary_sports: string[];
  other_sport: string;
  position_event: string;
  years_experience: string;
  fitness_goals: string[];
  training_days_per_week: number;
  injuries: string;
};

export const SPORT_OPTIONS = [
  "Football", "Track", "Basketball", "Baseball", "Soccer", "Wrestling", "Other",
] as const;

export const GOAL_OPTIONS = [
  "Get Faster", "Build Strength", "Improve Endurance",
  "Lose Weight", "Gain Muscle", "Make Varsity", "Go D1",
] as const;

export const GRADE_OPTIONS = ["6th", "7th", "8th", "9th", "10th", "11th", "12th"] as const;

export const EXPERIENCE_OPTIONS = ["Beginner", "1–2 years", "3–4 years", "5+ years"] as const;

export const fetchAthletic = async (userId: string): Promise<AthleticInfo | null> => {
  const { data } = await supabase
    .from("athlete_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const r = data as any;
  return {
    age: r.age ?? 13,
    height_ft: r.height_ft ?? 5,
    height_in: r.height_in ?? 0,
    weight_lbs: r.weight_lbs ?? 120,
    gender: (r.gender ?? "male") as "male" | "female",
    primary_sports: r.primary_sports ?? [],
    other_sport: r.other_sport ?? "",
    position_event: r.position_event ?? "",
    years_experience: r.years_experience ?? "",
    fitness_goals: r.fitness_goals ?? [],
    training_days_per_week: r.training_days_per_week ?? 3,
    injuries: r.injuries ?? "",
  };
};

export const saveAthletic = async (userId: string, p: AthleticInfo) => {
  const { error } = await supabase.from("athlete_profile").upsert({
    user_id: userId,
    age: p.age,
    height_ft: p.height_ft,
    height_in: p.height_in,
    weight_lbs: p.weight_lbs,
    gender: p.gender,
    primary_sports: p.primary_sports,
    other_sport: p.other_sport || null,
    position_event: p.position_event || null,
    years_experience: p.years_experience || null,
    fitness_goals: p.fitness_goals,
    training_days_per_week: p.training_days_per_week,
    injuries: p.injuries || null,
  });
  if (error) throw error;
};

export const savePersonal = async (
  userId: string,
  patch: Partial<Omit<PersonalInfo, "avatar_url">> & { avatar_url?: string | null },
) => {
  const upd: any = {};
  if (patch.display_name !== undefined) upd.display_name = patch.display_name || null;
  if (patch.bio !== undefined) upd.bio = patch.bio || null;
  if (patch.grade !== undefined) upd.grade = patch.grade || null;
  if (patch.school_name !== undefined) upd.school_name = patch.school_name || null;
  if (patch.username !== undefined) upd.username = patch.username || null;
  if (patch.avatar_url !== undefined) upd.avatar_url = patch.avatar_url;
  const { error } = await supabase
    .from("profiles")
    .update(upd)
    .eq("user_id", userId);
  if (error) throw error;
};

// Returns true if username is available (or unchanged)
export const checkUsernameAvailable = async (
  username: string,
  currentUserId: string,
): Promise<boolean> => {
  if (!username) return true;
  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .ilike("username", username)
    .maybeSingle();
  if (!data) return true;
  return data.user_id === currentUserId;
};

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
};

export const initialsFromName = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// HSL color from current theme primary token (resolved at runtime)
export const themeAccentColor = (): string => {
  if (typeof window === "undefined") return "#3b82f6";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  return v ? `hsl(${v})` : "#3b82f6";
};

// Public card (anyone can call)
export type PublicAthleteCard = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  grade: string | null;
  school_name: string | null;
  age: number | null;
  height_ft: number | null;
  height_in: number | null;
  weight_lbs: number | null;
  primary_sports: string[] | null;
  other_sport: string | null;
  position_event: string | null;
  years_experience: string | null;
  fitness_goals: string[] | null;
  training_days_per_week: number | null;
  total_xp: number;
  academic_xp?: number;
  gpa?: number | null;
  grade_level?: string | null;
};

export const fetchPublicCard = async (username: string): Promise<PublicAthleteCard | null> => {
  const { data, error } = await supabase.rpc("get_public_athlete_card", {
    _username: username,
  });
  if (error) {
    // error handled by caller
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
};