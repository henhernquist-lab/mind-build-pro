// Generates an MP3 podcast from a study note via ElevenLabs.
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_MODEL = "eleven_turbo_v2_5";
const MAX_CHARS = 5000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { text?: string; title?: string; voiceId?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const rawText = typeof body.text === "string" ? body.text : "";
  const title = typeof body.title === "string" ? body.title : "Study Podcast";
  const voiceId = typeof body.voiceId === "string" && body.voiceId.length > 0
    ? body.voiceId
    : DEFAULT_VOICE_ID;

  const text = rawText.trim().slice(0, MAX_CHARS);
  if (!text) {
    return new Response(JSON.stringify({ error: "text is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const intro = `Welcome to your study podcast. Today's topic: ${title}. Let's dive in.\n\n`;
  const outro = `\n\nThat's it for this episode. Keep up the great work, and good luck with your studies.`;
  const script = `${intro}${text}${outro}`;

  const elevenRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: script,
        model_id: DEFAULT_MODEL,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!elevenRes.ok) {
    const errText = await elevenRes.text();
    return new Response(
      JSON.stringify({ error: `ElevenLabs error (${elevenRes.status}): ${errText.slice(0, 500)}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const audio = await elevenRes.arrayBuffer();
  // Return base64 JSON so supabase.functions.invoke can decode reliably
  const bytes = new Uint8Array(audio);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)) as number[]);
  }
  const base64 = btoa(binary);

  return new Response(
    JSON.stringify({ audioBase64: base64, mimeType: "audio/mpeg", title }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});