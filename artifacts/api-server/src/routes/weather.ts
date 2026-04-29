import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type WeatherVerdict = {
  date: string;
  weatherCode: number;
  conditionLabel: string;
  emoji: string;
  tempMaxC: number;
  tempMinC: number;
  precipMm: number;
  windKmh: number;
  isOutdoorSafe: boolean;
  reason: string;
};

const codeMeta = (
  code: number,
): { label: string; emoji: string; severe: boolean; rainy: boolean; snowy: boolean; storm: boolean } => {
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

const evaluateOutdoorSafety = (
  meta: ReturnType<typeof codeMeta>,
  precipMm: number,
  windKmh: number,
  tempMaxC: number,
  tempMinC: number,
): { safe: boolean; reason: string } => {
  if (meta.storm) return { safe: false, reason: "Thunderstorms forecast — practice cancelled." };
  if (meta.snowy) return { safe: false, reason: "Snow forecast — practice cancelled." };
  if (precipMm >= 10) return { safe: false, reason: `Heavy rain expected (${precipMm.toFixed(1)} mm).` };
  if (meta.severe && precipMm >= 5) return { safe: false, reason: `Severe rain expected (${precipMm.toFixed(1)} mm).` };
  if (windKmh >= 50) return { safe: false, reason: `High winds expected (${windKmh.toFixed(0)} km/h).` };
  if (tempMaxC >= 38) return { safe: false, reason: `Dangerous heat (${tempMaxC.toFixed(0)}°C / ${(tempMaxC * 9 / 5 + 32).toFixed(0)}°F).` };
  if (tempMinC <= -10) return { safe: false, reason: `Dangerous cold (${tempMinC.toFixed(0)}°C / ${(tempMinC * 9 / 5 + 32).toFixed(0)}°F).` };
  if (precipMm >= 3) return { safe: true, reason: `Light rain expected (${precipMm.toFixed(1)} mm) — bring rain gear.` };
  return { safe: true, reason: "Conditions look fine for outdoor practice." };
};

router.get("/weather/forecast", async (req, res) => {
  const lat = Number(req.query["lat"]);
  const lon = Number(req.query["lon"]);
  const date = typeof req.query["date"] === "string" ? req.query["date"] : "";
  const days = Math.min(Math.max(Number(req.query["days"] ?? 7), 1), 14);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({ error: "lat and lon are required numbers" });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", String(days));

  try {
    const upstream = await fetch(url.toString());
    if (!upstream.ok) {
      const t = await upstream.text();
      logger.error({ status: upstream.status, t }, "Open-Meteo upstream error");
      res.status(502).json({ error: `Weather upstream error (${upstream.status})` });
      return;
    }
    const j = (await upstream.json()) as {
      daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        wind_speed_10m_max?: number[];
      };
    };
    const d = j.daily ?? {};
    const times = d.time ?? [];

    const verdicts: WeatherVerdict[] = times.map((t, i) => {
      const code = d.weather_code?.[i] ?? 0;
      const tempMax = d.temperature_2m_max?.[i] ?? 0;
      const tempMin = d.temperature_2m_min?.[i] ?? 0;
      const precip = d.precipitation_sum?.[i] ?? 0;
      const wind = d.wind_speed_10m_max?.[i] ?? 0;
      const meta = codeMeta(code);
      const verdict = evaluateOutdoorSafety(meta, precip, wind, tempMax, tempMin);
      return {
        date: t,
        weatherCode: code,
        conditionLabel: meta.label,
        emoji: meta.emoji,
        tempMaxC: tempMax,
        tempMinC: tempMin,
        precipMm: precip,
        windKmh: wind,
        isOutdoorSafe: verdict.safe,
        reason: verdict.reason,
      };
    });

    const target = verdicts.find((v) => v.date === date) ?? verdicts[0] ?? null;

    res.json({
      lat,
      lon,
      requestedDate: date,
      target,
      forecast: verdicts,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch weather forecast");
    res.status(500).json({ error: "Failed to fetch weather forecast" });
  }
});

export default router;
