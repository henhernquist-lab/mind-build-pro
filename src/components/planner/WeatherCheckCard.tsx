import { useEffect, useState, useMemo } from "react";
import { Cloud, CloudRain, MapPin, AlertTriangle, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteBlock, upsertOverride } from "@/lib/planner";
import { supabase } from "@/integrations/supabase/client";

type Verdict = {
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

type ResolvedBlockLite = {
  id?: string;
  recurringId?: string;
  startTime: string;
  endTime: string;
  label: string;
  category: "school" | "sports" | "free";
};

const OUTDOOR_KEYWORDS = [
  "football",
  "soccer",
  "track",
  "field",
  "baseball",
  "softball",
  "lacrosse",
  "rugby",
  "tennis",
  "golf",
  "cross country",
  "xc ",
  " xc",
  "running",
  "run ",
  " run",
  "outdoor",
  "ultimate",
  "frisbee",
  "rowing",
  "crew",
  "cycling",
  "biking",
  "ride",
  "hike",
  "ski",
  "surf",
  "skate",
  "horseback",
  "practice",
  "scrimmage",
  "game",
  "match",
  "meet",
  "tournament",
];

const isLikelyOutdoor = (block: ResolvedBlockLite): boolean => {
  if (block.category !== "sports") return false;
  const text = block.label.toLowerCase();
  if (!text) return true;
  if (/\b(gym|indoor|weight|lift|pool|swim|wrestling|basketball|volleyball|yoga|pilates)\b/.test(text)) {
    return false;
  }
  return OUTDOOR_KEYWORDS.some((kw) => text.includes(kw));
};

const LOCATION_KEY = "lifestack_weather_location";

type StoredLocation = { lat: number; lon: number; label?: string };

const loadStoredLocation = (): StoredLocation | null => {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === "number" && typeof parsed?.lon === "number") return parsed;
    return null;
  } catch {
    return null;
  }
};

const saveStoredLocation = (loc: StoredLocation) => {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
  } catch {}
};

export const WeatherCheckCard = ({
  dateKey,
  resolvedBlocks,
  userId,
  onChanged,
}: {
  dateKey: string;
  resolvedBlocks: ResolvedBlockLite[];
  userId: string | undefined;
  onChanged: () => void | Promise<void>;
}) => {
  const [location, setLocation] = useState<StoredLocation | null>(loadStoredLocation());
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [requesting, setRequesting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string>("");

  const outdoorBlocks = useMemo(
    () => resolvedBlocks.filter(isLikelyOutdoor),
    [resolvedBlocks],
  );

  useEffect(() => {
    if (!location) {
      setVerdict(null);
      return;
    }
    let cancel = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error } = await supabase.functions.invoke("weather-forecast", {
          body: { lat: location.lat, lon: location.lon, date: dateKey },
        });
        if (error) throw error;
        if (!cancel) setVerdict(((data as any)?.target ?? null) as Verdict | null);
      } catch (e: any) {
        if (!cancel) setError(e.message || "Weather lookup failed");
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    run();
    return () => {
      cancel = true;
    };
  }, [location, dateKey]);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation isn't supported in this browser");
      return;
    }
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        saveStoredLocation(next);
        setLocation(next);
        setRequesting(false);
        toast.success("Location saved");
      },
      (err) => {
        setRequesting(false);
        toast.error(err.message || "Couldn't get your location");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 * 30 },
    );
  };

  const clearLocation = () => {
    try { localStorage.removeItem(LOCATION_KEY); } catch {}
    setLocation(null);
    setVerdict(null);
  };

  const cancelBlock = async (block: ResolvedBlockLite) => {
    if (!userId) return;
    const key = block.id || block.recurringId || `${block.startTime}-${block.label}`;
    setCancellingId(key);
    try {
      if (block.recurringId) {
        await upsertOverride(userId, {
          type: "skip",
          recurringId: block.recurringId,
          date: dateKey,
        });
      } else if (block.id) {
        await deleteBlock(block.id);
      } else {
        toast.error("Can't cancel this block");
        return;
      }
      toast.success(`Crossed off: ${block.label || "practice"}`);
      await onChanged();
    } catch (e: any) {
      toast.error(e.message || "Couldn't cancel that practice");
    } finally {
      setCancellingId("");
    }
  };

  const cancelAll = async () => {
    if (!userId || outdoorBlocks.length === 0) return;
    let success = 0;
    for (const b of outdoorBlocks) {
      try {
        if (b.recurringId) {
          await upsertOverride(userId, {
            type: "skip",
            recurringId: b.recurringId,
            date: dateKey,
          });
          success++;
        } else if (b.id) {
          await deleteBlock(b.id);
          success++;
        }
      } catch {}
    }
    toast.success(`Crossed off ${success} practice${success === 1 ? "" : "s"} due to weather`);
    await onChanged();
  };

  if (!location) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 mb-4 flex items-start gap-3">
        <Cloud className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-semibold">Weather check</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Share your location once and we'll auto-flag outdoor practices when conditions look bad.
          </div>
        </div>
        <Button size="sm" onClick={requestLocation} disabled={requesting}>
          <MapPin className="h-3.5 w-3.5 mr-1.5" />
          {requesting ? "..." : "Use my location"}
        </Button>
      </div>
    );
  }

  const fF = (c: number) => `${Math.round(c * 9 / 5 + 32)}°F`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <div className="text-sm font-semibold">Weather check</div>
        </div>
        <button
          onClick={clearLocation}
          className="text-[10px] uppercase tracking-normalr text-muted-foreground hover:text-foreground"
        >
          Reset location
        </button>
      </div>

      {loading && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking forecast...
        </div>
      )}
      {error && (
        <div className="text-xs text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      {verdict && !loading && (
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xl">
                {verdict.emoji} <span className="text-sm font-medium align-middle">{verdict.conditionLabel}</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                High {fF(verdict.tempMaxC)} · Low {fF(verdict.tempMinC)} · Wind {Math.round(verdict.windKmh)} km/h · Precip {verdict.precipMm.toFixed(1)} mm
              </div>
            </div>
            <div className={`text-[11px] font-semibold uppercase tracking-normalr px-2 py-1 rounded-full ${
              verdict.isOutdoorSafe
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-destructive/10 text-destructive"
            }`}>
              {verdict.isOutdoorSafe ? "OK to play" : "Not safe"}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">{verdict.reason}</div>
        </div>
      )}

      {outdoorBlocks.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-normalr text-muted-foreground flex items-center justify-between">
            <span>Outdoor practices today</span>
            {verdict && !verdict.isOutdoorSafe && (
              <button
                onClick={cancelAll}
                className="text-destructive font-semibold hover:underline normal-case tracking-normal"
              >
                Cross off all
              </button>
            )}
          </div>
          {outdoorBlocks.map((b) => {
            const key = b.id || b.recurringId || `${b.startTime}-${b.label}`;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 bg-background/40"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{b.label || "Practice"}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {b.startTime} – {b.endTime}
                  </div>
                </div>
                {verdict && !verdict.isOutdoorSafe ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => cancelBlock(b)}
                    disabled={cancellingId === key}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    {cancellingId === key ? "..." : "Cancel"}
                  </Button>
                ) : (
                  <span className="text-[11px] text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Clear
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CloudRain className="h-3.5 w-3.5" /> No outdoor practices detected today.
        </div>
      )}
    </div>
  );
};

export default WeatherCheckCard;
