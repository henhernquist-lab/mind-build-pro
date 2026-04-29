// YouTube Data API v3 search proxy. Returns { videos: [{ id, title, channel, thumbnail, url }] }.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "YOUTUBE_API_KEY is not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({} as any));
  const query = String(body.query ?? "").trim();
  const requestedMax = Number(body.maxResults ?? 4);
  const maxResults = Math.min(Math.max(Number.isFinite(requestedMax) ? requestedMax : 4, 1), 10);

  if (!query) {
    return new Response(JSON.stringify({ error: "query is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", apiKey);

  const upstream = await fetch(url.toString());
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("YouTube API error", upstream.status, detail);
    return new Response(
      JSON.stringify({ error: `YouTube API error (${upstream.status})`, detail }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const j = await upstream.json();
  const videos = (j.items ?? [])
    .filter((it: any) => it.id?.videoId)
    .map((it: any) => ({
      id: it.id.videoId,
      title: it.snippet?.title ?? "",
      channel: it.snippet?.channelTitle ?? "",
      thumbnail:
        it.snippet?.thumbnails?.medium?.url ??
        it.snippet?.thumbnails?.high?.url ??
        it.snippet?.thumbnails?.default?.url ??
        "",
      url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
    }));

  return new Response(JSON.stringify({ query, videos }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});