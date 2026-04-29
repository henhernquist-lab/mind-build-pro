// Open-Meteo daily forecast + outdoor-safety verdict. No API key needed.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type Meta = { label: string; emoji: string; severe: boolean; rainy: boolean; snowy: boolean; storm: boolean };
const codeMeta = (code: number): Meta => {
  if (code === 0) return { label: "Clear sky", emoji: "☀️", severe: false, rainy: false, snowy: false, storm: false };
  if (code <= 3) return { label: "Partly cloudy", emoji: "⛅", severe: false, rainy: false, snowy: false, storm: false };
  if (code <= 48) return { label: "Foggy", emoji: "🌫️", severe: false, rainy: false, snowy: false, storm: false };
  if (code <= 57) return { label: "Drizzle", emoji: "🌦️", severe: false, rainy: true, snowy: false, storm: false };
  if (code <= 65) return { label: "Rain", emoji: "🌧️", severe: code >= 63, rainy: true, snowy: false, storm: false };
  if (code <= 67) return { label: "Freezing rain", emoji: "🌧️❄️", severe: true, rainy: true, snowy: false, storm: false };
  if (code <= 77) return { label: "Snow", emoji: "🌨️", severe: code >= 73, rainy: false, snowy: true, storm: false };
  if (code <= 82) return { label: "Rain showers", emoji: "🌧️", severe: code >= 81, rainy: true, snowy: false, storm: false };
  if (code <= 86) return { label: "Snow showers", emoji: "🌨️", severe: true, rainy: false, snowy: true, storm: false };
  return { label: "Thunderstorm", emoji: "⛈️", severe: true, rainy: true, snowy: false, storm: true };
};

const evalSafety = (m: Meta, precipMm: number, windKmh: number, tMaxC: number, tMinC: number) => {
  if (m.storm) return { safe: false, reason: "Thunderstorms forecast — practice cancelled." };
  if (m.snowy) return { safe: false, reason: "Snow forecast — practice cancelled." };
  if (precipMm >= 10) return { safe: false, reason: `Heavy rain expected (${precipMm.toFixed(1)} mm).` };
  if (m.severe && precipMm >= 5) return { safe: false, reason: `Severe rain expected (${precipMm.toFixed(1)} mm).` };
  if (windKmh >= 50) return { safe: false, reason: `High winds expected (${windKmh.toFixed(0)} km/h).` };
  if (tMaxC >= 38) return { safe: false, reason: `Dangerous heat (${tMaxC.toFixed(0)}°C).` };
  if (tMinC <= -10) return { safe: false, reason: `Dangerous cold (${tMinC.toFixed(0)}°C).` };
  if (precipMm >= 3) return { safe: true, reason: `Light rain expected (${precipMm.toFixed(1)} mm) — bring rain gear.` };
  return { safe: true, reason: "Conditions look fine for outdoor practice." };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let lat: number, lon: number, date: string, days = 7;
  if (req.method === "POST") {
    const b = await req.json().catch(() => ({} as any));
    lat = Number(b.lat); lon = Number(b.lon); date = String(b.date ?? "");
    if (b.days) days = Math.min(Math.max(Number(b.days), 1), 14);
  } else {
    const u = new URL(req.url);
    lat = Number(u.searchParams.get("lat"));
    lon = Number(u.searchParams.get("lon"));
    date = String(u.searchParams.get("date") ?? "");
    const d = u.searchParams.get("days");
    if (d) days = Math.min(Math.max(Number(d), 1), 14);
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return new Response(JSON.stringify({ error: "lat and lon are required numbers" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ error: "date must be YYYY-MM-DD" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", String(days));

  const upstream = await fetch(url.toString());
  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: `Weather upstream error (${upstream.status})` }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const j = await upstream.json();
  const d = j.daily ?? {};
  const times: string[] = d.time ?? [];
  const verdicts = times.map((t: string, i: number) => {
    const code = d.weather_code?.[i] ?? 0;
    const tMax = d.temperature_2m_max?.[i] ?? 0;
    const tMin = d.temperature_2m_min?.[i] ?? 0;
    const precip = d.precipitation_sum?.[i] ?? 0;
    const wind = d.wind_speed_10m_max?.[i] ?? 0;
    const m = codeMeta(code);
    const v = evalSafety(m, precip, wind, tMax, tMin);
    return {
      date: t, weatherCode: code, conditionLabel: m.label, emoji: m.emoji,
      tempMaxC: tMax, tempMinC: tMin, precipMm: precip, windKmh: wind,
      isOutdoorSafe: v.safe, reason: v.reason,
    };
  });
  const target = verdicts.find((v: any) => v.date === date) ?? verdicts[0] ?? null;
  return new Response(JSON.stringify({ lat, lon, requestedDate: date, target, forecast: verdicts }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});