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

    const { college_id, contact_id } = await req.json();
    if (!college_id) return new Response(JSON.stringify({ error: "college_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const [{ data: college }, { data: contact }, { data: athlete }, { data: academic }, { data: profile }] = await Promise.all([
      supabase.from("colleges").select("*").eq("id", college_id).eq("user_id", user.id).single(),
      contact_id ? supabase.from("recruitment_contacts").select("*").eq("id", contact_id).single() : Promise.resolve({ data: null }),
      supabase.from("athlete_profile").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("academic_profile").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    if (!college) return new Response(JSON.stringify({ error: "college not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const greeting = contact?.name ? `Coach ${contact.name.split(" ").slice(-1)[0]}` : `Coach`;
    const prompt = `Draft a professional, concise college recruiting outreach email from a high-school athlete to a college coach. Use real specifics — no placeholders or brackets.

ATHLETE
- Name: ${profile?.display_name ?? "Student Athlete"}
- Graduation year: ${athlete?.graduation_year ?? "TBD"}
- Sport: ${athlete?.primary_sports?.join(", ") ?? "TBD"}
- Position/Event: ${athlete?.position_event ?? "TBD"}
- Years experience: ${athlete?.years_experience ?? "TBD"}
- Height/Weight: ${athlete?.height_ft ?? "?"}'${athlete?.height_in ?? "?"}", ${athlete?.weight_lbs ?? "?"} lbs
- GPA: ${academic?.gpa ?? "TBD"}${academic?.gpa_weighted ? " (weighted)" : ""}
- Grade level: ${academic?.grade_level ?? "TBD"}

TARGET
- College: ${college.name}
- Division/Level: ${college.division ?? college.athletic_level ?? "?"}
- Coach contact: ${contact?.name ?? "Coach"} (${contact?.role ?? "Coaching staff"})

Format the response as JSON:
{"subject":"...","body":"Dear ${greeting},\\n\\n..."}

Body should be 4 short paragraphs: intro + interest, athletic credentials, academic credentials, call-to-action with availability. Sign off with the athlete's name.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Add AI credits to continue." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await aiResp.json();
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { subject: `Recruitment Interest — ${profile?.display_name}`, body: raw }; }

    return new Response(JSON.stringify({ subject: parsed.subject ?? "", body: parsed.body ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});