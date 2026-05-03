const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, questions, answers } = await req.json() as {
      subject: string;
      questions: { question: string; model_answer?: string; type: string }[];
      answers: string[];
    };

    if (!Array.isArray(questions) || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: "questions and answers arrays required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: return 50% scores if no API key
      return new Response(JSON.stringify({
        results: questions.map(() => ({ score: 50, feedback: "Auto-grading unavailable.", model_answer: "" })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pairs = questions.map((q, i) => ({
      question: q.question,
      model_answer: q.model_answer ?? "",
      student_answer: answers[i] ?? "",
    }));

    const prompt = `You are grading short-answer questions for a ${subject} student (8th grade level).

For each question, evaluate the student's answer and return a score 0-100 and brief feedback.

Scoring guide:
- 90-100: Complete, accurate, uses correct terminology
- 70-89: Mostly correct with minor gaps
- 50-69: Partially correct, missing key points
- 30-49: Shows some understanding but major errors
- 0-29: Incorrect or blank

Questions and answers:
${pairs.map((p, i) => `
Q${i + 1}: ${p.question}
Model answer: ${p.model_answer || "(open-ended)"}
Student answer: ${p.student_answer || "(blank)"}
`).join("\n")}

Return ONLY this JSON array (no prose):
[
  { "score": 85, "feedback": "Good explanation, but missed mentioning X.", "model_answer": "The complete answer is..." },
  ...
]

One entry per question in order. feedback max 20 words. model_answer max 30 words.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You output strict JSON arrays only. No markdown, no prose." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      // Fallback on AI error
      return new Response(JSON.stringify({
        results: questions.map(() => ({ score: 50, feedback: "Could not grade automatically.", model_answer: "" })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "[]";

    let results: { score: number; feedback: string; model_answer: string }[] = [];
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      // Handle both array and object with array property
      const parsed = JSON.parse(cleaned);
      results = Array.isArray(parsed) ? parsed : (parsed.results ?? parsed.grades ?? []);
    } catch {
      results = questions.map(() => ({ score: 50, feedback: "Could not parse grading.", model_answer: "" }));
    }

    // Sanitize and ensure correct length
    const sanitized = questions.map((_, i) => {
      const r = results[i] ?? {};
      return {
        score: Math.min(100, Math.max(0, Math.round(Number(r.score) || 50))),
        feedback: String(r.feedback || "No feedback available.").slice(0, 200),
        model_answer: String(r.model_answer || "").slice(0, 300),
      };
    });

    return new Response(JSON.stringify({ results: sanitized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: unknown) {
    console.error("grade-short-answers error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
