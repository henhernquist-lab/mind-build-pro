import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      subject, topic, difficulty, count, sourceText,
      questionTypes, additionalInstructions,
    } = await req.json();

    if (!subject || typeof subject !== "string") {
      return new Response(JSON.stringify({ error: "subject is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const total = Math.min(Math.max(parseInt(count) || 10, 3), 25);
    const diff = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium";
    const types: string[] = Array.isArray(questionTypes) && questionTypes.length > 0
      ? questionTypes
      : ["multiple_choice"];

    const typeInstructions = types.map((t) => {
      switch (t) {
        case "multiple_choice": return "Multiple choice: 4 options (A-D), one correct, correct_index 0-3";
        case "true_false": return "True/False: options must be exactly [\"True\", \"False\"], correct_index 0 or 1";
        case "short_answer": return "Short answer: options array should be empty [], correct_index -1, include model_answer field with the ideal answer";
        case "fill_blank": return "Fill in the blank: question contains ___ where the blank is, options array empty, correct_index -1, include blank_answer field with the missing word";
        case "vocab_match": return "Vocabulary match: question is a term, options array empty, correct_index -1, include definition field";
        default: return "";
      }
    }).filter(Boolean).join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert test creator for 8th grade students. Generate ${total} questions on the given subject and topic at ${diff} difficulty.

Question types to use (distribute evenly): ${types.join(", ")}
Type-specific rules:
${typeInstructions}

For ALL questions include:
- question: the question text
- type: one of the type strings above
- options: array (4 items for MCQ, 2 for T/F, empty for others)
- correct_index: integer (0-3 for MCQ, 0-1 for T/F, -1 for others)
- topic: 2-4 word topic tag
- explanation: one sentence explaining the correct answer
- model_answer: (short_answer only) the ideal answer
- blank_answer: (fill_blank only) the missing word
- definition: (vocab_match only) the definition of the term

Vary topics to surface specific weak spots. Make questions clear and educational.
${additionalInstructions ? `Additional instructions: ${additionalInstructions}` : ""}`;

    const userPrompt = `Subject: ${subject}
Topic: ${topic || "general"}
Difficulty: ${diff}
Question types: ${types.join(", ")}
${sourceText ? `\nBase the questions on this source material:\n"""${String(sourceText).slice(0, 6000)}"""` : ""}
Generate ${total} questions.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_quiz",
            description: "Return generated practice test questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      type: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correct_index: { type: "integer", minimum: -1, maximum: 3 },
                      topic: { type: "string" },
                      explanation: { type: "string" },
                      model_answer: { type: "string" },
                      blank_answer: { type: "string" },
                      definition: { type: "string" },
                    },
                    required: ["question", "type", "options", "correct_index", "topic", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_quiz" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again in a minute." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate test" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      return new Response(JSON.stringify({ error: "No questions returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    const questions = (parsed.questions ?? []).slice(0, total);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-practice-test error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});