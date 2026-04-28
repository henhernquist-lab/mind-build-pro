import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a sports nutrition coach for student-athletes (ages 12-22).
Given the athlete's stats and goal, return a macro and calorie plan as STRICT JSON only — no prose, no markdown fences.

Schema:
{
  "calories": number,                // total daily kcal
  "protein_g": number,               // grams/day
  "carbs_g": number,                 // grams/day
  "fat_g": number,                   // grams/day
  "water_oz": number,                // fluid ounces/day
  "tdee": number,                    // estimated maintenance kcal
  "bmr": number,                     // basal metabolic rate
  "rationale": string,               // 2-3 short sentences explaining the plan
  "meal_split": { "breakfast": number, "lunch": number, "dinner": number, "snacks": number }, // kcal
  "tips": string[]                   // 3-5 concise actionable tips for the athlete
}

Rules:
- Use Mifflin-St Jeor for BMR. Apply activity multiplier based on training_days_per_week (1.4 sedentary -> 1.8 high).
- Adjust calories: cut = TDEE - 400, maintain = TDEE, bulk = TDEE + 350.
- Protein: 0.9-1.1 g/lb bodyweight (cap at 1.1 for cut, 1.0 for bulk, 0.9 for maintain).
- Fat: ~25-30% of calories.
- Carbs: remaining calories / 4.
- Water: bodyweight_lbs * 0.6 + 16 oz per training day.
- Round all grams/cals to nearest 5. Round water to nearest 4.
- Keep tips youth-athlete friendly (no extreme cuts, emphasize whole foods).
- Output ONLY the JSON object, nothing else.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { age, gender, height_in, weight_lbs, training_days_per_week, sport, goal, notes } = body;

    const userMsg = `Athlete profile:
- Age: ${age}
- Gender: ${gender}
- Height: ${height_in} inches
- Weight: ${weight_lbs} lbs
- Training days/week: ${training_days_per_week}
- Primary sport: ${sport ?? "general"}
- Goal: ${goal}
${notes ? `- Notes: ${notes}` : ""}

Return the macro plan JSON.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
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
    try { parsed = JSON.parse(content); } catch { parsed = { error: "Bad AI response", raw: content }; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});