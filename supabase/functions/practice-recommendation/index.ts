import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, scorePct, weakTopics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are a study coach. Given a student's recent practice test result, suggest the SINGLE most useful next action in one short sentence (under 25 words). Be specific about the topic to focus on.",
          },
          {
            role: "user",
            content: `Subject: ${subject}\nScore: ${scorePct}%\nWeak topics: ${(weakTopics ?? []).join(", ") || "none"}\n\nWhat should they do next?`,
          },
        ],
      }),
    });

    if (resp.status === 429 || resp.status === 402) {
      return new Response(JSON.stringify({ recommendation: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) throw new Error("AI gateway error");

    const data = await resp.json();
    const recommendation = data?.choices?.[0]?.message?.content?.trim() ?? null;
    return new Response(JSON.stringify({ recommendation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("practice-recommendation error:", e);
    return new Response(JSON.stringify({ recommendation: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});