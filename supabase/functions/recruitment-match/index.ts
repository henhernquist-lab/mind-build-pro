import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { college_id } = await req.json();
    if (!college_id) return new Response(JSON.stringify({ error: "college_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const [{ data: college }, { data: athlete }, { data: academic }, { data: profile }] = await Promise.all([
      supabase.from("colleges").select("*").eq("id", college_id).eq("user_id", user.id).single(),
      supabase.from("athlete_profile").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("academic_profile").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    if (!college) return new Response(JSON.stringify({ error: "college not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Compute deterministic match score
    const breakdown: any = {};
    let totalWeight = 0;
    let earned = 0;

    // Academic (40%)
    if (college.academic_avg_gpa && academic?.gpa) {
      totalWeight += 40;
      const gap = Number(academic.gpa) - Number(college.academic_avg_gpa);
      const score = Math.max(0, Math.min(100, 70 + gap * 30)); // at-avg=70, +0.3 above=100
      breakdown.academic = { weight: 40, score: Math.round(score), user_gpa: academic.gpa, target_gpa: college.academic_avg_gpa, gap: gap.toFixed(2) };
      earned += score * 40 / 100;
    }

    // Athletic level fit (30%)
    if (college.athletic_level && athlete?.years_experience) {
      totalWeight += 30;
      const lvl = String(college.athletic_level).toLowerCase();
      let s = 50;
      const yrs = athlete.years_experience;
      if (lvl.includes("d3") || lvl.includes("naia")) s = 80;
      if (lvl.includes("d2")) s = 70;
      if (lvl.includes("d1")) s = (yrs === "5+" || yrs === "3-5") ? 75 : 55;
      breakdown.athletic = { weight: 30, score: s, level: college.athletic_level, experience: yrs };
      earned += s * 30 / 100;
    }

    // Sport match (20%)
    if (college.sport && athlete?.primary_sports?.length) {
      totalWeight += 20;
      const match = athlete.primary_sports.some((sp: string) => sp.toLowerCase().includes(String(college.sport).toLowerCase()) || String(college.sport).toLowerCase().includes(sp.toLowerCase()));
      const s = match ? 100 : 30;
      breakdown.sport = { weight: 20, score: s, college_sport: college.sport, your_sports: athlete.primary_sports };
      earned += s * 20 / 100;
    }

    // Graduation year (10%)
    if (athlete?.graduation_year) {
      totalWeight += 10;
      const yrsOut = athlete.graduation_year - new Date().getFullYear();
      const s = yrsOut >= 0 && yrsOut <= 4 ? 100 : 60;
      breakdown.timing = { weight: 10, score: s, graduation_year: athlete.graduation_year };
      earned += s * 10 / 100;
    }

    const finalScore = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

    // AI fit summary
    let summary = "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (apiKey) {
      try {
        const prompt = `You are a college recruiting advisor. Given this athlete profile and college target, write a 2-3 sentence personalized fit summary. Be specific, actionable, and motivational.

Athlete: ${profile?.display_name ?? "Athlete"}, GPA ${academic?.gpa ?? "?"}, sports: ${athlete?.primary_sports?.join(", ") ?? "?"}, position: ${athlete?.position_event ?? "?"}, grad year: ${athlete?.graduation_year ?? "?"}, experience: ${athlete?.years_experience ?? "?"}

College: ${college.name} (${college.division ?? "?"}, ${college.athletic_level ?? "?"}), sport: ${college.sport ?? "?"}, avg GPA: ${college.academic_avg_gpa ?? "?"}

Match score: ${finalScore}/100. Breakdown: ${JSON.stringify(breakdown)}

Write only the summary, no preamble.`;
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }] }),
        });
        if (aiResp.ok) {
          const j = await aiResp.json();
          summary = j.choices?.[0]?.message?.content?.trim() ?? "";
        }
      } catch (e) { console.error("AI summary failed", e); }
    }

    await supabase.from("colleges").update({
      match_score: finalScore,
      match_breakdown: breakdown,
      match_summary: summary,
      computed_at: new Date().toISOString(),
    }).eq("id", college_id);

    return new Response(JSON.stringify({ score: finalScore, breakdown, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});