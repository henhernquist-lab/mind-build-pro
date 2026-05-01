import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      athleticXp = 0,
      academicXp = 0,
      athleticRank = "Recruit",
      academicRank = "Freshman",
      totalPRs = 0,
      totalWorkouts = 0,
      topSubject = null,
      seasonNumber = 1,
      mode = "recap", // recap | start
      displayName = "Athlete",
      goals = [],
    } = body ?? {};

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt =
      mode === "start"
        ? `Write ONE energetic 1-2 sentence motivational message for ${displayName} starting Season ${seasonNumber}. Their goals: ${goals.join(", ") || "general improvement"}. Be specific, not generic. No emojis.`
        : `Write ONE punchy 1-sentence recap of a 2-week training season. Stats: Season ${seasonNumber}, athletic XP ${athleticXp} (peak rank: ${athleticRank}), academic XP ${academicXp} (peak rank: ${academicRank}), ${totalWorkouts} workouts, ${totalPRs} PRs${topSubject ? `, top subject ${topSubject}` : ""}. Sound like a sports announcer. No emojis. Under 22 words.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You write short, energetic, specific recaps. Never generic. Never use emojis." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway ${r.status}`);
    }
    const j = await r.json();
    const recap = j?.choices?.[0]?.message?.content?.trim() ?? "";
    return new Response(JSON.stringify({ recap }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("season-recap error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});