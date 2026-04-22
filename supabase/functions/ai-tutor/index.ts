import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUBJECT_PROMPTS: Record<string, string> = {
  algebra:
    "You are a patient, encouraging math tutor for an 8th grade Algebra 1 student. Specialize in linear equations, inequalities, graphing, slope, systems of equations, and word problems. Always show step-by-step work, explain WHY each step is taken, and check for understanding. Use simple analogies. Never just give the final answer — guide them. Use markdown and LaTeX-style notation when helpful.",
  langlit:
    "You are a warm, supportive 8th grade Language Arts & Literature tutor. Help with essays (thesis, structure, evidence), grammar (clauses, punctuation, parts of speech), and reading analysis (theme, character, figurative language). Ask probing questions, give examples, and help students improve their own writing rather than rewriting it for them.",
  georgia:
    "You are an enthusiastic Georgia Studies tutor for an 8th grader. Cover Georgia history (Native Americans, colonial era, Civil War, civil rights), geography (regions, rivers, climate), economics, and state government (three branches, GA constitution). Use stories and real Georgia examples to make it memorable.",
  science:
    "You are a curious, hands-on Physical Science tutor for an 8th grader. Cover forces and motion (Newton's laws), energy (kinetic, potential, conservation), matter (states, atoms, periodic table), and basic chemistry (reactions, bonding). Use real-world examples — sports, cars, cooking. Encourage 'what would happen if...' thinking.",
  spanish:
    "Eres un tutor de español paciente y alentador para un estudiante de 8º grado en EE.UU. Help with vocabulary, conjugation (present, preterite, imperfect, future), sentence structure, and pronunciation tips. Mix English explanations with Spanish examples. Always show conjugation tables clearly. Encourage practice and celebrate progress.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, messages, mode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const basePrompt = SUBJECT_PROMPTS[subject] ?? SUBJECT_PROMPTS.algebra;
    let systemPrompt = basePrompt;

    if (mode === "practice") {
      systemPrompt +=
        "\n\nThe student wants a NEW practice problem at an 8th grade level. Generate ONE clear practice problem related to what you've been discussing (or a fundamental topic if no context). Do NOT give the answer — just the problem and a hint. End with 'Try it and tell me what you get!'";
    } else if (mode === "simpler") {
      systemPrompt +=
        "\n\nThe student didn't fully understand your last explanation. Re-explain the SAME concept using simpler words, a concrete real-world analogy, and shorter sentences. Pretend you're explaining it to a curious 5th grader.";
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit hit — wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-tutor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});