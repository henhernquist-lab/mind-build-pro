import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MATH_INSTRUCTION =
  "\n\nIMPORTANT MATH FORMATTING (applies to EVERY subject — math, science, Spanish conjugation tables, etc.):\n" +
  "When writing any mathematical expression, equation, fraction, square root, exponent, or symbol — always wrap it in LaTeX format.\n" +
  "- Use single $ for inline math: $\\sqrt{18}$, $\\frac{1}{2}$, $x^2$\n" +
  "- Use double $$ on its own line for standalone equations:\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n" +
  "- NEVER write math as plain text like \"sqrt(18)\", \"x^2\", \"1/2\", or \"pi*r^2\" — always use LaTeX with $ delimiters.\n" +
  "- Do NOT put spaces immediately inside the delimiters: write $x^2$ not $ x^2 $.\n" +
  "- Only use $ as a math delimiter. If you need to mention a price, write it as \"5 dollars\" instead of \"$5\".";

const VISUAL_INSTRUCTION = `

VISUAL ENHANCEMENTS:
After your text answer, if a visual diagram would genuinely help, append a single block on its own line in EXACTLY this format:

[VISUAL]
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
   ... your SVG content here ...
</svg>
[/VISUAL]

Rules: Plain SVG only, no scripts. Use white/light strokes (#e5e7eb) and colored fills (#3b82f6, #22c55e, #f97316, #ef4444). At most ONE visual per response. Skip for simple text answers.`;

const GRAPH_INSTRUCTION = `

MATH GRAPHS: When a plottable function would help the student VISUALIZE a math concept (linear, quadratic, systems, parabolas, etc.), append a single GRAPH tag on its own line at the END:

[GRAPH: y=2x+3]

For multiple expressions: [GRAPH: y=x^2, y=2x+1]. Standard math syntax (^ for powers). Skip for pure arithmetic. Don't combine with [VISUAL]. Max one [GRAPH:] per response.`;

const DEEP_SEARCH_INSTRUCTION = `

DEEP SEARCH MODE: Web search results are provided below. Use them to give a current, accurate, well-cited answer. Cite sources inline as [1], [2] etc. At the very end on a new line append:

[SOURCES]
1. {url}
2. {url}
[/SOURCES]

Only include sources you actually used.`;

async function webSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  try {
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" },
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const results: { title: string; url: string; snippet: string }[] = [];
    const blockRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = blockRe.exec(html)) && results.length < 5) {
      let url = m[1];
      const uddg = url.match(/uddg=([^&]+)/);
      if (uddg) url = decodeURIComponent(uddg[1]);
      results.push({
        title: m[2].replace(/<[^>]+>/g, "").trim(),
        url,
        snippet: m[3].replace(/<[^>]+>/g, "").trim(),
      });
    }
    return results;
  } catch (e) { console.error("webSearch error:", e); return []; }
}

const isMathClass = (label?: string) => !!label && /algebra|geometry|calc|trig|stat|math|precalc/i.test(label);

const buildSystemPrompt = (customLabel: string, studentProfile: any): string => {
  const sp = studentProfile ?? {};
  const className = sp.className || customLabel || "their class";
  const name = sp.name || "the student";
  const gradeLevel = sp.gradeLevel || sp.grade || "high school";
  const classGrade = sp.classGrade ? `Their current grade in this class is ${sp.classGrade}${sp.classGradePct ? ` (${sp.classGradePct}%)` : ""}.` : "";
  const difficulty = sp.classDifficulty || "Standard";
  const teacher = sp.classTeacher ? `Teacher: ${sp.classTeacher}.` : "";
  const studyStyle = sp.studyStyle ? `Preferred study style: ${sp.studyStyle}.` : "";
  const sports = Array.isArray(sp.sports) && sp.sports.length ? `Sport(s): ${sp.sports.join(", ")}${sp.position ? ` (${sp.position})` : ""}.` : "";
  const goals = Array.isArray(sp.goals) && sp.goals.length ? `Fitness goals: ${sp.goals.join(", ")}.` : "";
  const gpa = sp.gpa != null ? `GPA: ${sp.gpa}.` : "";

  const intensity = /AP|IB|Honors|Dual/i.test(difficulty)
    ? "This is a rigorous course — push them harder, expect deeper analysis, and challenge them with extension questions."
    : "Keep it grounded and clear. Don't overwhelm with advanced jargon.";

  const gradeAdjust = sp.classGrade && /[CDF]/i.test(sp.classGrade)
    ? "Their grade in this class is low — be extra patient, thorough, celebrate small wins, and check understanding constantly."
    : sp.classGrade && /A/i.test(sp.classGrade)
      ? "They're already doing well in this class — push them with stretch questions and deeper concepts."
      : "";

  return [
    `You are a patient, encouraging tutor helping ${name}, a ${gradeLevel} student, with ${className}.`,
    classGrade,
    `Difficulty level: ${difficulty}.`,
    teacher,
    studyStyle,
    sports,
    goals,
    gpa,
    "",
    `Personalize every response to this student. ${intensity} ${gradeAdjust}`,
    "Use their sport and interests as analogies when it helps explain concepts. Address them by name. Match the tone to their grade level. Always show step-by-step work and check for understanding rather than just giving the final answer.",
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { customLabel, messages, mode, deepSearch, videosEnabled, mindmap, sourceText, format, studentProfile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ===== MIND MAP MODE =====
    if (mindmap && typeof mindmap === "string") {
      const useMermaid = format === "mermaid";
      const photoContext = sourceText
        ? `\n\nThe student has provided a photo of their notes. Here is the content to base the mind map on:\n"""\n${String(sourceText).slice(0, 4000)}\n"""`
        : "";

      const mmPrompt = useMermaid
        ? `Generate a Mermaid.js mindmap for the topic: "${mindmap}"

Rules:
- Use mindmap syntax (not flowchart)
- Root node uses double parentheses: ((${mindmap}))
- Maximum 4 main branches from root
- Each branch has 2-3 sub-nodes maximum
- Keep all node labels under 4 words
- Cover the most important concepts only — quality over quantity
- No special characters except hyphens in node labels

Format exactly like this (no backticks, no markdown):
mindmap
  root((${mindmap}))
    Branch One
      Sub concept
      Sub concept
    Branch Two
      Sub concept
      Sub concept
    Branch Three
      Sub concept
    Branch Four
      Sub concept
      Sub concept`
        : `You are an expert tutor creating a study mind map for a student about: "${mindmap}"${customLabel ? ` (subject: ${customLabel})` : ``}.${photoContext}\n\nReturn ONLY valid JSON (no prose, no fences):\n{\n  "topic": "<short central topic>",\n  "summary": "<one-sentence overview>",\n  "branches": [\n    { "title": "<key concept>", "color": "<blue|green|orange|purple|pink|cyan>", "children": [ { "title": "<sub-idea>", "detail": "<short clarifier>" } ] }\n  ]\n}\n\n4-6 branches, 2-4 children each. Titles <5 words; details <12 words. Vary colors. JSON only.`;

      const mmResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: useMermaid ? "You output only valid Mermaid mindmap syntax. No prose, no backticks, no markdown." : "You output strict JSON only." }, { role: "user", content: mmPrompt }],
          ...(useMermaid ? {} : { response_format: { type: "json_object" } }),
        }),
      });
      if (!mmResp.ok) {
        const t = await mmResp.text();
        return new Response(JSON.stringify({ error: "Mind map failed", detail: t }), { status: mmResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await mmResp.json();
      const raw = (data.choices?.[0]?.message?.content ?? "").trim();

      if (useMermaid) {
        // Strip any accidental markdown fences
        const cleaned = raw.replace(/^```[\w]*\n?/gm, "").replace(/^```$/gm, "").trim();
        return new Response(JSON.stringify({ mermaid: cleaned }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let json: any = {};
      try { json = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); if (m) { try { json = JSON.parse(m[0]); } catch {} } }
      return new Response(JSON.stringify(json), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== DYNAMIC SYSTEM PROMPT (built from student's class info) =====
    let systemPrompt = buildSystemPrompt(customLabel, studentProfile) + MATH_INSTRUCTION + VISUAL_INSTRUCTION;
    if (isMathClass(studentProfile?.className || customLabel)) systemPrompt += GRAPH_INSTRUCTION;

    if (videosEnabled) {
      systemPrompt += `\n\nVIDEO RECOMMENDATIONS: If a short YouTube video would help, append on a new line at the END (after [GRAPH:]/[VISUAL]):\n\n[VIDEOS: <short search query>]\n\nKeep query under 8 words. Only include when genuinely helpful. Max one per response.`;
    }
    if (mode === "practice") {
      systemPrompt += "\n\nThe student wants a NEW practice problem at their grade level. Generate ONE clear problem related to what you've discussed. Do NOT give the answer — just the problem and a hint. End with 'Try it and tell me what you get!'";
    } else if (mode === "simpler") {
      systemPrompt += "\n\nThe student didn't fully understand. Re-explain the SAME concept using simpler words, a concrete real-world analogy (use their sport if relevant), and shorter sentences.";
    }

    let augmentedMessages = messages;
    if (deepSearch) {
      systemPrompt += DEEP_SEARCH_INSTRUCTION;
      const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
      if (lastUser) {
        const results = await webSearch(lastUser.content);
        if (results.length > 0) {
          const block = results.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join("\n\n");
          augmentedMessages = [...messages.slice(0, -1), { role: "user", content: `${lastUser.content}\n\n--- WEB SEARCH RESULTS ---\n${block}\n--- END RESULTS ---` }];
        }
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...augmentedMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit — wait a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-tutor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
