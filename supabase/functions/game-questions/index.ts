import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACADEMIC_DIFF = ["Freshman", "Honor Roll", "Dean's List", "Scholar", "Valedictorian"] as const;

type Mode = "question" | "boss_dialogue" | "debate" | "judge" | "ai_answer" | "topic_list" | "custom_json";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const mode: Mode = body.mode ?? "question";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const academicRank = body.academicRank ?? "Freshman";
    const subject = body.subject ?? "General";
    const studentName = body.studentName ?? "the student";

    const difficultyHint = `Difficulty: ${academicRank}. Recruit/Freshman = basic recall, Honor Roll = application, Dean's List = multi-step, Scholar = cross-subject, Valedictorian = open-ended critical thinking.`;

    let system = "";
    let user = "";
    let model = "google/gemini-2.5-flash";
    let json = true;

    if (mode === "question") {
      system = `You generate ONE multiple-choice or short-answer study question. Return JSON only.`;
      user = `Generate ONE ${subject} question for ${studentName}. ${difficultyHint}\n${body.context ?? ""}\nAvoid these previously-asked questions: ${JSON.stringify(body.avoid ?? [])}\n\nReturn JSON: { "question": "...", "type": "multiple_choice" | "short_answer", "choices": ["A","B","C","D"] | null, "answer": "...", "explanation": "one short sentence why" }`;
    } else if (mode === "boss_dialogue") {
      system = `You roleplay as a boss character. Stay in character, max 2 short sentences.`;
      user = `Boss: ${body.bossName} — ${body.bossPersonality}\nPlayer ${body.event}. Boss HP ${body.bossHp}/10, player HP ${body.playerHp}/3, streak ${body.streak ?? 0}.\nReturn JSON: { "line": "<your in-character line>" }`;
    } else if (mode === "debate") {
      system = `You are debating ${body.position === "for" ? "FOR" : "AGAINST"} this topic. Be sharp, focused, structured. Use evidence and reasoning.`;
      user = `Topic: "${body.topic}". Round: ${body.round} (1=opening, 2=rebuttal, 3=closing).\nStudent's last argument: ${body.lastUserArgument ?? "(opening)"}\n\nReturn JSON: { "argument": "<2-4 sentence response, in plain text>" }`;
    } else if (mode === "judge") {
      system = `You are an impartial debate judge. Output strict JSON only.`;
      user = `Judge this 3-round debate between student "${studentName}" and AI on topic "${body.topic}". Student took the position: ${body.position}.\n\nFull transcript:\n${body.transcript}\n\nScore each category 0-25 and provide written feedback. Reference the student's bio if relevant: "${body.bio ?? ""}".\n\nReturn JSON: { "scores": { "argument": <int>, "evidence": <int>, "rebuttal": <int>, "clarity": <int> }, "total": <int>, "feedback": "<3-5 sentences>", "strongest_sentence": "<verbatim quote>" }`;
    } else if (mode === "ai_answer") {
      // Simulate an AI opponent in flashcard battle. Returns whether they got it right based on accuracy %
      const accuracy = body.accuracy ?? 0.5;
      const got_it = Math.random() < accuracy;
      // Skip the AI call entirely; respond synthetically
      return new Response(JSON.stringify({ got_it, latency_ms: 900 + Math.random() * 1800 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (mode === "topic_list") {
      system = `You generate study debate topics. Output JSON only.`;
      user = `Generate 5 short debate topics suitable for a high school ${subject} class. Return JSON: { "topics": ["...", "..."] }`;
    } else if (mode === "custom_json") {
      system = body.system ?? "Output strict JSON only.";
      user = body.prompt ?? "";
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); }
    catch { const m = raw.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch {} } }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
