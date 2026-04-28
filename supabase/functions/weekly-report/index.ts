// Generates an AI-powered biweekly report card from a user's recent activity.
// Pulls: rank history, recent workouts, vocab progress, tests, streak.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull recent activity (last 14 days)
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const sinceDate = since.slice(0, 10);

    const [profile, athletic, academic, streak, workouts, vocab, tests, history] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_stats").select("xp").eq("user_id", user.id).maybeSingle(),
      supabase.from("academic_stats").select("xp").eq("user_id", user.id).maybeSingle(),
      supabase.from("study_streak").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("workout_logs").select("sport, exercise, value, unit, is_pr, logged_at").eq("user_id", user.id).gte("logged_at", since).order("logged_at", { ascending: false }).limit(40),
      supabase.from("vocab_words").select("mastered, reps, last_reviewed_at").eq("user_id", user.id),
      supabase.from("academic_tests").select("title, subject, completed, test_date, score").eq("user_id", user.id).gte("test_date", sinceDate),
      supabase.from("rank_history").select("rank_type, highest_rank_name, final_xp, period_end").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
    ]);

    const vocabRows = vocab.data ?? [];
    const summary = {
      name: profile.data?.display_name ?? "Athlete",
      athletic_xp: athletic.data?.xp ?? 0,
      academic_xp: academic.data?.xp ?? 0,
      streak: streak.data?.current_streak ?? 0,
      longest_streak: streak.data?.longest_streak ?? 0,
      study_days: streak.data?.total_study_days ?? 0,
      workouts_logged: workouts.data?.length ?? 0,
      prs: (workouts.data ?? []).filter((w: any) => w.is_pr).map((w: any) => `${w.exercise} ${w.value}${w.unit}`),
      sports: [...new Set((workouts.data ?? []).map((w: any) => w.sport))],
      vocab_mastered: vocabRows.filter((v: any) => v.mastered).length,
      vocab_reviewed: vocabRows.filter((v: any) => v.last_reviewed_at && v.last_reviewed_at >= since).length,
      tests_taken: (tests.data ?? []).filter((t: any) => t.completed),
      tests_upcoming: (tests.data ?? []).filter((t: any) => !t.completed),
      previous_periods: history.data ?? [],
    };

    const system = "You are a concise, motivating high school coach. Write the report in 2nd person ('you'). Output strict JSON only.";
    const prompt = `Generate a 2-week report card for ${summary.name}.\nData:\n${JSON.stringify(summary, null, 2)}\n\nReturn JSON: {\n  "headline": "<one short hype line>",\n  "grade": "<A+|A|B|C|D|F>",\n  "wins": ["<3 specific wins>"],\n  "struggles": ["<2 areas to improve, specific>"],\n  "next_2_weeks": ["<3 concrete actions>"],\n  "athletic_summary": "<2 sentences>",\n  "academic_summary": "<2 sentences>"\n}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let report: any = {};
    try { report = JSON.parse(raw); } catch {}

    return new Response(JSON.stringify({ report, stats: summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
