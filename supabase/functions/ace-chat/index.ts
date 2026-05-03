import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ATHLETIC_RANKS = [
  { name: "Recruit", icon: "🥉", xp: 0 },
  { name: "Varsity", icon: "🔵", xp: 100 },
  { name: "All-Star", icon: "⭐", xp: 300 },
  { name: "Elite", icon: "🏆", xp: 600 },
  { name: "Legend", icon: "🔥", xp: 1000 },
];
const ACADEMIC_RANKS = [
  { name: "Freshman", icon: "📖", xp: 0 },
  { name: "Honor Roll", icon: "📝", xp: 150 },
  { name: "Dean's List", icon: "🎓", xp: 400 },
  { name: "Scholar", icon: "🔬", xp: 800 },
  { name: "Valedictorian", icon: "🧠", xp: 1500 },
];
const PERIOD_DAYS = 14;

const rankFor = (xp: number, list: typeof ATHLETIC_RANKS) => {
  let r = list[0];
  for (const c of list) { if (xp >= c.xp) r = c; else break; }
  const next = list.find((x) => x.xp > xp);
  return { current: r, next, toNext: next ? next.xp - xp : 0 };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { messages, currentPath, leadWithSuggestion } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
      currentPath?: string;
      leadWithSuggestion?: string | null;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const today = new Date().toISOString().slice(0, 10);
    const [
      { data: profile },
      { data: athlete },
      { data: academic },
      { data: usStat },
      { data: acStat },
      { data: classes },
      { data: blocks },
      { data: meals },
      { data: workouts },
      { data: streak },
    ] = await Promise.all([
      supabase.from("profiles").select("display_name, grade, school_name").eq("user_id", user.id).maybeSingle(),
      supabase.from("athlete_profile").select("primary_sports, position_event, fitness_goals, weight_lbs").eq("user_id", user.id).maybeSingle(),
      supabase.from("academic_profile").select("gpa, grade_level, study_hours_per_day").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_stats").select("xp, period_start").eq("user_id", user.id).maybeSingle(),
      supabase.from("academic_stats").select("xp, period_start").eq("user_id", user.id).maybeSingle(),
      supabase.from("academic_classes").select("class_name, current_grade, current_grade_pct").eq("user_id", user.id).order("sort_order"),
      supabase.from("planner_blocks").select("start_time, end_time, label, category").eq("user_id", user.id).eq("date", today).order("start_time"),
      supabase.from("meal_logs").select("calories, protein_g, carbs_g, fat_g").eq("user_id", user.id).eq("log_date", today),
      supabase.from("workout_logs").select("exercise, value, unit, is_pr, logged_at").eq("user_id", user.id).gte("logged_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("logged_at", { ascending: false }),
      supabase.from("study_streak").select("current_streak, longest_streak").eq("user_id", user.id).maybeSingle(),
    ]);

    // Water intake for today
    const { data: waterLogs } = await supabase
      .from("water_logs")
      .select("hydration_credit_ml")
      .eq("user_id", user.id)
      .eq("log_date", today);
    const { data: waterGoalRow } = await supabase
      .from("user_water_goals")
      .select("goal_ml")
      .eq("user_id", user.id)
      .maybeSingle();
    const waterTodayMl = (waterLogs || []).reduce((s: number, r: any) => s + (r.hydration_credit_ml || 0), 0);
    const waterGoalMl = (waterGoalRow as any)?.goal_ml ?? 2000;
    const waterPct = Math.round((waterTodayMl / waterGoalMl) * 100);
    const currentHour = new Date().getHours();

    const firstName = (profile?.display_name || user.email?.split("@")[0] || "there").split(" ")[0];
    const athleticXp = (usStat as any)?.xp ?? 0;
    const academicXp = (acStat as any)?.xp ?? 0;
    const ar = rankFor(athleticXp, ATHLETIC_RANKS);
    const acr = rankFor(academicXp, ACADEMIC_RANKS);

    const seasonStart = (usStat as any)?.period_start || today;
    const seasonEnd = new Date(new Date(seasonStart).getTime() + PERIOD_DAYS * 86400000);
    const daysLeft = Math.max(0, Math.ceil((seasonEnd.getTime() - Date.now()) / 86400000));

    const macroTotals = (meals || []).reduce(
      (a: any, m: any) => ({
        cal: a.cal + (m.calories || 0),
        p: a.p + (m.protein_g || 0),
        c: a.c + (m.carbs_g || 0),
        f: a.f + (m.fat_g || 0),
      }),
      { cal: 0, p: 0, c: 0, f: 0 },
    );

    const recentPRs = (workouts || []).filter((w: any) => w.is_pr).slice(0, 3);
    const workoutsThisWeek = (workouts || []).length;

    const classGrades = (classes || []).map((c: any) =>
      `${c.class_name}${c.current_grade ? ` (${c.current_grade}${c.current_grade_pct ? ` ${c.current_grade_pct}%` : ""})` : ""}`
    ).join(", ") || "no classes added yet";

    const todayBlocks = (blocks || []).map((b: any) => `${b.start_time}-${b.end_time} ${b.label}`).join(" • ") || "nothing scheduled";

    const PAGE_HINTS: Record<string, string> = {
      "/": "Daily Planner page",
      "/workouts": "Workouts page",
      "/nutrition": "Nutrition page",
      "/tutor": "AI Tutor page",
      "/profile": "Profile page",
      "/leaderboard": "Leaderboard page",
      "/championship": "Championship page",
      "/recruitment": "Recruitment page",
      "/practice": "Practice Tests page",
      "/tests": "Tests calendar page",
      "/notes": "Study Notes page",
      "/vocab": "Vocab page",
    };
    const currentPage = PAGE_HINTS[currentPath || "/"] || "the app";

    const systemPrompt = `You are Ace, the personal AI guide for the Ace Your Day / LifeStack app.
You are friendly, energetic, and supportive — like a personal coach and tutor rolled into one.

THIS STUDENT:
- Name: ${firstName}
- Grade: ${academic?.grade_level || profile?.grade || "high school"}
- School: ${profile?.school_name || "—"}
- Sport: ${(athlete?.primary_sports || []).join(", ") || "—"}${athlete?.position_event ? ` (${athlete.position_event})` : ""}
- Athletic Rank: ${ar.current.icon} ${ar.current.name} — ${athleticXp} XP${ar.next ? ` (${ar.toNext} XP to ${ar.next.name})` : " (max rank!)"}
- Academic Rank: ${acr.current.icon} ${acr.current.name} — ${academicXp} XP${acr.next ? ` (${acr.toNext} XP to ${acr.next.name})` : " (max rank!)"}
- GPA: ${academic?.gpa ?? "—"}
- Classes: ${classGrades}
- Fitness goals: ${(athlete?.fitness_goals || []).join(", ") || "—"}
- Current season ends in: ${daysLeft} day${daysLeft === 1 ? "" : "s"}
- Today's planner: ${todayBlocks}
- Today's macros so far: ${macroTotals.cal} cal, ${macroTotals.p}g protein, ${macroTotals.c}g carbs, ${macroTotals.f}g fat
- Today's water intake: ${(waterTodayMl / 1000).toFixed(1)}L / ${(waterGoalMl / 1000).toFixed(1)}L goal (${waterPct}%)
- Workouts logged this week: ${workoutsThisWeek}
- Recent PRs: ${recentPRs.map((p: any) => `${p.exercise} ${p.value}${p.unit}`).join(", ") || "none yet this week"}
- Study streak: ${(streak as any)?.current_streak ?? 0} days (best: ${(streak as any)?.longest_streak ?? 0})
- Currently on: ${currentPage}

YOUR JOB:
- Help navigate the app — give exact, step-by-step instructions when asked
- Give personalized advice based on their REAL data above (rank progress, classes, macros, season timing)
- Answer quick academic questions briefly. If a question is deep/complex, say "that's a deep one — let me open the full tutor for you" and end your reply with [NAVIGATE:/tutor]
- Motivate and hype them based on goals and rank progress
- Give nutrition tips based on remaining macros for today
- If it's past 2pm (hour >= 14) and water intake is below 50% of goal, proactively remind them to hydrate
- If water goal is hit today, celebrate it briefly
- Warn them about upcoming rank resets and encourage grinding
- Celebrate PRs, rank ups, achievements

APP NAV REFERENCE (use these paths in [NAVIGATE:...] when offering to take them somewhere):
/ Planner | /workouts Workouts | /nutrition Nutrition | /tutor AI Tutor
/tests Tests | /vocab Vocab | /notes Notes | /practice Practice Tests
/leaderboard Leaderboard | /championship Championship | /recruitment Recruitment
/profile Profile

RULES:
- Keep responses SHORT — max 3-4 sentences unless asked for detail.
- Use ${firstName}'s first name naturally. Be hype but not annoying.
- Use occasional emojis but don't overdo it.
- When suggesting a navigation, append [NAVIGATE:/path] on its own line at the end. The UI will render a button.
- NEVER use markdown headers (no #). Plain conversational text only.${leadWithSuggestion ? `\n\nIMPORTANT: Lead your reply with this proactive note before answering the user: "${leadWithSuggestion}"` : ""}`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10),
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Slow down, champ — try again in a sec." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Out of AI credits. Add funds to keep using Ace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Ace is offline" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await aiResp.json();
    const reply = j.choices?.[0]?.message?.content ?? "Hmm, I went blank. Try again?";

    // Persist last user msg + this reply
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      await supabase.from("ace_messages").insert([
        { user_id: user.id, role: "user", content: lastUser.content },
        { user_id: user.id, role: "assistant", content: reply },
      ]);
    }

    // Trim to last 20
    const { data: all } = await supabase
      .from("ace_messages")
      .select("id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (all && all.length > 20) {
      const idsToDelete = all.slice(20).map((r: any) => r.id);
      await supabase.from("ace_messages").delete().in("id", idsToDelete);
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});