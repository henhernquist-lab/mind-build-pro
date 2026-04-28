import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a youth sports nutrition coach. Given the athlete's REMAINING macros for the day, their goal,
and any preferences/allergies, suggest 3 specific realistic meals that together help fill the remaining macro gap.

Return STRICT JSON only:
{
  "suggestions": [
    { "name": string, "description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }
  ]
}

Each suggestion should be a concrete meal (not "have some chicken"). Round macros to nearest 5g. Keep description ≤ 80 chars.

If mode === "game_day", instead return a 4-item plan: pre_game (3-4hr before), pre_game_snack (1hr before), halftime, post_game.
Each item: name, description, calories, protein_g, carbs_g, fat_g, timing (string).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { remaining, goal, preferences, allergies, mode } = await req.json();

    const userMsg = mode === "game_day"
      ? `Build a complete GAME DAY meal plan for an athlete.
Goal: ${goal ?? "performance"}
Preferences: ${preferences ?? "none"}
Allergies: ${allergies ?? "none"}
Return JSON with key "game_day_plan" as array of 4 items: pre_game, pre_game_snack, halftime, post_game.`
      : `Athlete has the following macros LEFT to hit today:
Calories: ${remaining?.calories ?? 0}
Protein: ${remaining?.protein_g ?? 0}g
Carbs: ${remaining?.carbs_g ?? 0}g
Fat: ${remaining?.fat_g ?? 0}g
Goal: ${goal ?? "maintain"}
Preferences: ${preferences ?? "none"}
Allergies: ${allergies ?? "none"}
Return 3 meal suggestions as JSON.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      const status = resp.status === 429 || resp.status === 402 ? resp.status : 500;
      return new Response(JSON.stringify({ error: errText }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = { error: "Bad AI response" }; }
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});