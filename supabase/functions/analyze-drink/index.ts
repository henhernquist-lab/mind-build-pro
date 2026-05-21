const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image } = await req.json() as { image: string };

    if (!image) {
      return new Response(JSON.stringify({ error: "image (base64) is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a hydration tracking assistant. Analyze this photo and identify any drink or container visible.

Estimate:
1. What type of container it is (water bottle, cup, glass, jug, etc.)
2. The container's total capacity in ml
3. How full the container appears as a percentage
4. How much liquid is currently IN the container
5. Whether the drink is water or something else (juice, soda, sports drink, coffee, tea)

The user is logging how much they DRANK — if the bottle looks half empty assume they drank the missing portion. If it looks full assume they are about to drink it all.

If no drink or container is visible, set estimated_amount_ml to 0 and add a note explaining.
If the image is too dark or blurry, set confidence to "low" and explain in notes.
If multiple containers are visible, pick the most prominent one and note it.

Return ONLY this JSON with no other text:
{
  "container_type": "water bottle",
  "total_capacity_ml": 500,
  "fill_percentage": 100,
  "estimated_amount_ml": 500,
  "drink_type": "water",
  "is_water": true,
  "confidence": "high",
  "notes": "Standard 500ml water bottle, appears full"
}

drink_type must be one of: water, sports_drink, juice, coffee, tea, soda, other
confidence must be one of: high, medium, low`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: image,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", errText);
      return new Response(JSON.stringify({ error: "AI analysis failed", details: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text ?? "";

    // Parse JSON from response
    let result: Record<string, unknown>;
    try {
      // Strip any markdown code fences if present
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Claude response:", rawText);
      return new Response(JSON.stringify({ error: "Could not parse AI response", raw: rawText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate and sanitize
    const validDrinkTypes = ["water", "sports_drink", "juice", "coffee", "tea", "soda", "other"];
    const validConfidence = ["high", "medium", "low"];

    const sanitized = {
      container_type: String(result.container_type ?? "container"),
      total_capacity_ml: Math.max(0, Math.round(Number(result.total_capacity_ml) || 0)),
      fill_percentage: Math.min(100, Math.max(0, Math.round(Number(result.fill_percentage) || 0))),
      estimated_amount_ml: Math.max(0, Math.round(Number(result.estimated_amount_ml) || 0)),
      drink_type: validDrinkTypes.includes(String(result.drink_type)) ? String(result.drink_type) : "other",
      is_water: Boolean(result.is_water),
      confidence: validConfidence.includes(String(result.confidence)) ? String(result.confidence) : "medium",
      notes: String(result.notes ?? ""),
    };

    return new Response(JSON.stringify(sanitized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    console.error("analyze-drink error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
