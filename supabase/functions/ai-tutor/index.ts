import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUBJECT_PROMPTS: Record<string, string> = {
  algebra:
    "You are a patient, encouraging math tutor for an 8th grade Algebra 1 student. Specialize in linear equations, inequalities, graphing, slope, systems of equations, and word problems. Always show step-by-step work, explain WHY each step is taken, and check for understanding. Use simple analogies. Never just give the final answer — guide them.",
  langlit:
    "You are a warm, supportive 8th grade Language Arts & Literature tutor. Help with essays (thesis, structure, evidence), grammar (clauses, punctuation, parts of speech), and reading analysis (theme, character, figurative language). Ask probing questions, give examples, and help students improve their own writing rather than rewriting it for them.",
  georgia:
    "You are an enthusiastic Georgia Studies tutor for an 8th grader. Cover Georgia history (Native Americans, colonial era, Civil War, civil rights), geography (regions, rivers, climate), economics, and state government (three branches, GA constitution). Use stories and real Georgia examples to make it memorable.",
  science:
    "You are a curious, hands-on Physical Science tutor for an 8th grader. Cover forces and motion (Newton's laws), energy (kinetic, potential, conservation), matter (states, atoms, periodic table), and basic chemistry (reactions, bonding). Use real-world examples — sports, cars, cooking. Encourage 'what would happen if...' thinking.",
  spanish:
    "Eres un tutor de español paciente y alentador para un estudiante de 8º grado en EE.UU. Help with vocabulary, conjugation (present, preterite, imperfect, future), sentence structure, and pronunciation tips. Mix English explanations with Spanish examples. Always show conjugation tables clearly. Encourage practice and celebrate progress.",
};

const MATH_INSTRUCTION =
  "\n\nIMPORTANT MATH FORMATTING: Always use LaTeX formatting for any math expressions. Wrap inline math in single dollar signs like $x^2 + 3$ and block equations in double dollar signs like $$\\frac{1}{2}$$. NEVER write raw LaTeX commands without dollar sign delimiters. For example write $\\sqrt{18}$ not \\sqrt{18}.";

const VISUAL_INSTRUCTION = `

VISUAL ENHANCEMENTS:
After your text answer, if (and only if) a visual diagram would genuinely help, append a single block on its own line in EXACTLY this format:

[VISUAL]
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
   ... your SVG content here ...
</svg>
[/VISUAL]

Rules for the visual:
- Use ONLY plain SVG (no scripts, no external resources, no foreign objects).
- Use viewBox="0 0 400 300" or similar; keep it under 500x400.
- Use white/light strokes (#e5e7eb) and colored fills (#3b82f6, #22c55e, #f97316, #ef4444).
- Do NOT include the [VISUAL] block for simple text-only answers.
- Include AT MOST ONE visual per response.`;

const GRAPH_INSTRUCTION = `

MATH GRAPHS (Algebra only):
Whenever a plottable function or equation would help the student VISUALIZE the concept (linear equations, quadratics, systems of equations, inequalities, parabolas, etc.), append a single GRAPH tag on its own line AT THE END of your message:

[GRAPH: y=2x+3]

For multiple expressions on one graph, separate with commas:
[GRAPH: y=x^2, y=2x+1]

Rules:
- Use standard math syntax: ^ for powers, * for multiplication (can omit), y=, x=, or equations like x^2+y^2=25.
- Only include [GRAPH:] when the equation is actually plottable (skip for pure arithmetic, fractions, word problems without a function).
- Do NOT use [GRAPH:] and [VISUAL] together — prefer [GRAPH:] for Algebra functions.
- Include AT MOST ONE [GRAPH:] per response.`;

const DEEP_SEARCH_INSTRUCTION = `

DEEP SEARCH MODE: You have been provided with web search results below. Use them to give a current, accurate, well-cited answer. Cite sources inline as [1], [2] etc. matching the numbered sources. At the very end of your message, on a new line, append:

[SOURCES]
1. {url}
2. {url}
[/SOURCES]

Only include sources you actually used.`;

// Simple DuckDuckGo HTML search — free, no key. Returns top results.
async function webSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  try {
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const results: { title: string; url: string; snippet: string }[] = [];
    // Parse result blocks
    const blockRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = blockRe.exec(html)) && results.length < 5) {
      let url = m[1];
      // DuckDuckGo wraps real urls in /l/?uddg=...
      const uddg = url.match(/uddg=([^&]+)/);
      if (uddg) url = decodeURIComponent(uddg[1]);
      const title = m[2].replace(/<[^>]+>/g, "").trim();
      const snippet = m[3].replace(/<[^>]+>/g, "").trim();
      results.push({ title, url, snippet });
    }
    return results;
  } catch (e) {
    console.error("webSearch error:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, customLabel, messages, mode, deepSearch, videosEnabled } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const basePrompt =
      SUBJECT_PROMPTS[subject] ??
      `You are a patient, encouraging tutor helping an 8th-grade student with ${
        customLabel || subject
      }. Keep explanations clear and encouraging. Break things down step-by-step, use simple analogies, and check for understanding.`;
    let systemPrompt = basePrompt + MATH_INSTRUCTION + VISUAL_INSTRUCTION;
    if (subject === "algebra") systemPrompt += GRAPH_INSTRUCTION;

    if (videosEnabled) {
      systemPrompt += `\n\nVIDEO RECOMMENDATIONS:\nIf a short YouTube video would help the student understand a concept you just taught, append a single VIDEO tag on its own line at the END of your message (after any [GRAPH:] or [VISUAL] block):\n\n[VIDEOS: <short search query>]\n\nKeep the query under 8 words and focused on the specific concept (e.g. "[VIDEOS: solving two-step equations]"). Only include this when a video would genuinely help — skip for trivial answers, casual chat, or pure practice problems. Maximum one [VIDEOS:] tag per response.`;
    }

    if (mode === "practice") {
      systemPrompt +=
        "\n\nThe student wants a NEW practice problem at an 8th grade level. Generate ONE clear practice problem related to what you've been discussing (or a fundamental topic if no context). Do NOT give the answer — just the problem and a hint. End with 'Try it and tell me what you get!'";
    } else if (mode === "simpler") {
      systemPrompt +=
        "\n\nThe student didn't fully understand your last explanation. Re-explain the SAME concept using simpler words, a concrete real-world analogy, and shorter sentences. Pretend you're explaining it to a curious 5th grader.";
    }

    // Deep Search: fetch web results and inject them
    let augmentedMessages = messages;
    if (deepSearch) {
      systemPrompt += DEEP_SEARCH_INSTRUCTION;
      const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
      if (lastUser) {
        const results = await webSearch(lastUser.content);
        if (results.length > 0) {
          const block = results
            .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`)
            .join("\n\n");
          augmentedMessages = [
            ...messages.slice(0, -1),
            {
              role: "user",
              content: `${lastUser.content}\n\n--- WEB SEARCH RESULTS ---\n${block}\n--- END RESULTS ---`,
            },
          ];
        }
      }
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
            ...augmentedMessages,
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