// One-time migration: copy localStorage data into Supabase for the signed-in user.
import { supabase } from "@/integrations/supabase/client";

export type LocalSnapshot = {
  hasAny: boolean;
  blocks: { date: string; start_time: string; end_time: string; label: string; category: string }[];
  recurring: any[];
  workouts: { sport: string; entries: any[] }[];
  athleteProfile: any | null;
  xp: number | null;
  rankHistory: any[];
  subjects: any[];
  theme: string | null;
};

export const collectLocalSnapshot = (): LocalSnapshot => {
  const blocks: LocalSnapshot["blocks"] = [];
  const recurring: any[] = [];
  const workouts: LocalSnapshot["workouts"] = [];
  let athleteProfile = null;
  let xp: number | null = null;
  const rankHistory: any[] = [];
  let subjects: any[] = [];
  let theme: string | null = null;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Old planner_YYYY-MM-DD format (30-min slots map of time -> {label, category})
      const m = k.match(/^planner_(\d{4}-\d{2}-\d{2})$/);
      if (m) {
        try {
          const day = JSON.parse(localStorage.getItem(k) || "{}");
          for (const time of Object.keys(day)) {
            const block = day[time];
            const [h, mm] = time.split(":").map(Number);
            const endH = mm === 30 ? h + 1 : h;
            const endM = mm === 30 ? 0 : 30;
            blocks.push({
              date: m[1],
              start_time: time,
              end_time: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
              label: block.label || "",
              category: block.category || "school",
            });
          }
        } catch {}
      }
    }
    const recRaw = localStorage.getItem("planner_recurring");
    if (recRaw) {
      try { recurring.push(...JSON.parse(recRaw)); } catch {}
    }
    for (const sport of ["football", "track", "weightlifting", "running"]) {
      const raw = localStorage.getItem(`workouts:${sport}`);
      if (raw) {
        try { workouts.push({ sport, entries: JSON.parse(raw) }); } catch {}
      }
    }
    const athRaw = localStorage.getItem("athlete:profile");
    if (athRaw) { try { athleteProfile = JSON.parse(athRaw); } catch {} }
    const xpRaw = localStorage.getItem("rank_xp");
    if (xpRaw) { try { xp = JSON.parse(xpRaw); } catch {} }
    const histRaw = localStorage.getItem("rank_history");
    if (histRaw) { try { rankHistory.push(...JSON.parse(histRaw)); } catch {} }
    const subjRaw = localStorage.getItem("tutor:subjects");
    if (subjRaw) { try { subjects = JSON.parse(subjRaw); } catch {} }
    const themeRaw = localStorage.getItem("app:theme");
    if (themeRaw) { try { theme = JSON.parse(themeRaw); } catch {} }
  } catch {}

  const hasAny =
    blocks.length > 0 ||
    recurring.length > 0 ||
    workouts.some((w) => w.entries.length > 0) ||
    !!athleteProfile ||
    (xp !== null && xp > 0) ||
    rankHistory.length > 0 ||
    subjects.length > 0;

  return { hasAny, blocks, recurring, workouts, athleteProfile, xp, rankHistory, subjects, theme };
};

export const importSnapshot = async (userId: string, snap: LocalSnapshot) => {
  // planner blocks
  if (snap.blocks.length > 0) {
    const rows = snap.blocks.map((b) => ({ ...b, user_id: userId }));
    await supabase.from("planner_blocks").insert(rows);
  }

  // recurring (note: old recurring used `time` not start/end — derive 30-min)
  if (snap.recurring.length > 0) {
    const rows = snap.recurring.map((ev: any) => {
      const start = ev.start_time || ev.time || "08:00";
      const end = ev.end_time || (() => {
        const [h, m] = start.split(":").map(Number);
        const eh = m === 30 ? h + 1 : h;
        const em = m === 30 ? 0 : 30;
        return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
      })();
      return {
        user_id: userId,
        start_time: start,
        end_time: end,
        label: ev.label || "",
        category: ev.category || "school",
        rule: ev.rule || { type: "daily" },
        start_date: ev.startDate || new Date().toISOString().slice(0, 10),
        end_date: ev.endDate ?? null,
      };
    });
    await supabase.from("planner_recurring").insert(rows);
  }

  // workouts
  for (const w of snap.workouts) {
    if (w.entries.length === 0) continue;
    const rows = w.entries.map((e: any) => ({
      user_id: userId,
      sport: w.sport,
      exercise: e.exercise,
      value: e.value,
      unit: e.unit,
      added_weight: e.addedWeight ?? null,
      is_pr: !!e.isPR,
      grade: e.grade ?? null,
      xp: e.xp ?? null,
      note: e.note ?? null,
      breakdown: e.breakdown ?? null,
      logged_at: e.date || new Date().toISOString(),
    }));
    await supabase.from("workout_logs").insert(rows);
  }

  // athlete profile
  if (snap.athleteProfile) {
    await supabase.from("athlete_profile").upsert({
      user_id: userId,
      age: snap.athleteProfile.age ?? 13,
      height_ft: snap.athleteProfile.heightFt ?? 5,
      height_in: snap.athleteProfile.heightIn ?? 0,
      weight_lbs: snap.athleteProfile.weightLbs ?? 120,
      gender: snap.athleteProfile.gender ?? "male",
    });
  }

  // xp
  if (snap.xp !== null) {
    await supabase.from("user_stats").upsert({
      user_id: userId,
      xp: snap.xp,
      current_month: new Date().toISOString().slice(0, 7),
    });
  }

  // rank history
  if (snap.rankHistory.length > 0) {
    const rows = snap.rankHistory.map((h: any) => ({
      user_id: userId,
      month_key: h.monthKey,
      month_name: h.monthName,
      final_xp: h.finalXp,
      highest_rank_name: h.highestRankName,
      highest_rank_icon: h.highestRankIcon,
    }));
    await supabase.from("rank_history").upsert(rows, { onConflict: "user_id,month_key" });
  }

  // subjects
  if (snap.subjects.length > 0) {
    const rows = snap.subjects.map((s: any, i: number) => ({
      user_id: userId,
      slug: s.id,
      label: s.label,
      emoji: s.emoji || "📚",
      color: s.color || "school",
      description: s.description ?? null,
      sort_order: i,
    }));
    await supabase.from("subjects").upsert(rows, { onConflict: "user_id,slug" });
  }

  // theme preference
  if (snap.theme) {
    await supabase.from("user_preferences").upsert({
      user_id: userId,
      theme: snap.theme,
    });
  }

  // Mark migrated
  localStorage.setItem("migration_done", "true");
};

export const clearLocalAppData = () => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (
      k.startsWith("planner_") ||
      k.startsWith("workouts:") ||
      k === "athlete:profile" ||
      k === "rank_xp" ||
      k === "rank_month" ||
      k === "rank_history" ||
      k === "rank_reset_notice" ||
      k === "tutor:subjects" ||
      k === "homework:tasks"
    ) {
      keysToRemove.push(k);
    }
  }
  for (const k of keysToRemove) localStorage.removeItem(k);
};