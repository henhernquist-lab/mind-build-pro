import { useEffect, useState } from "react";
import { Plus, Loader2, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Trophy, Heart, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchAthletic } from "@/lib/profile";

const FN = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

const BODY_PARTS = ["Knee", "Ankle", "Shoulder", "Back", "Hamstring", "Quad", "Hip", "Wrist", "Elbow", "Neck", "Foot", "Calf", "Other"];
const INJURY_TYPES = ["Strain", "Sprain", "Soreness", "Tendinitis", "Fracture", "Post-Surgery", "Other"];
const SEVERITIES = [
  { id: "mild", label: "Mild", sub: "Still can train lightly", color: "text-amber-400" },
  { id: "moderate", label: "Moderate", sub: "Limited activity", color: "text-orange-400" },
  { id: "severe", label: "Severe", sub: "Complete rest", color: "text-red-400" },
];

type InjuryPhaseDay = {
  day: number;
  activities: string[];
  avoid: string[];
  goal: string;
};

type InjuryPhase = {
  phase_number: number;
  phase_name: string;
  duration_days: number;
  days: InjuryPhaseDay[];
};

type Protocol = {
  estimated_recovery_days: number;
  phases: InjuryPhase[];
  return_to_play_signs: string[];
  warning_signs: string[];
  disclaimer: string;
};

type Injury = {
  id: string;
  sport: string;
  body_part: string;
  injury_type: string;
  severity: string;
  date_of_injury: string;
  protocol_json: Protocol | null;
  estimated_return_date: string | null;
  status: "active" | "recovered";
  created_at: string;
  description?: string;
  cleared_by_doctor?: boolean;
};

type CheckIn = {
  id: string;
  injury_id: string;
  date: string;
  pain_level: number;
  activities_completed: string[];
  notes?: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const daysBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

const CompletionRing = ({ done, total }: { done: number; total: number }) => {
  const pct = total > 0 ? done / total : 0;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <svg width="44" height="44" className="flex-shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke={pct >= 1 ? "hsl(142 70% 50%)" : "hsl(var(--primary))"}
        strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fill="currentColor" className="text-foreground font-bold">
        {done}/{total}
      </text>
    </svg>
  );
};

export default function Recovery() {
  const { user } = useAuth();
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [checkIns, setCheckIns] = useState<Record<string, CheckIn[]>>({});
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState<string | null>(null);
  const [painLevel, setPainLevel] = useState(3);
  const [expandedPhase, setExpandedPhase] = useState<Record<string, number>>({});
  const [recoveryOpen, setRecoveryOpen] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    body_part: "Knee",
    injury_type: "Sprain",
    severity: "mild",
    date_of_injury: todayISO(),
    description: "",
    cleared_by_doctor: false,
    sport: "",
  });

  const [athleteInfo, setAthleteInfo] = useState<{ age: number; weight_lbs: number; height_ft: number; height_in: number; sport: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [ath, { data: inj }] = await Promise.all([
        fetchAthletic(user.id),
        supabase.from("injuries").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (ath) {
        setAthleteInfo({ age: ath.age ?? 16, weight_lbs: ath.weight_lbs ?? 150, height_ft: ath.height_ft ?? 5, height_in: ath.height_in ?? 8, sport: (ath.primary_sports ?? []).join(", ") });
        setForm((f) => ({ ...f, sport: (ath.primary_sports ?? []).join(", ") }));
      }
      const injuries = (inj ?? []) as Injury[];
      setInjuries(injuries);
      // Load check-ins for active injuries
      for (const inj of injuries.filter((i) => i.status === "active")) {
        const { data: ci } = await supabase.from("recovery_checkins").select("*").eq("injury_id", inj.id).order("date", { ascending: true });
        setCheckIns((prev) => ({ ...prev, [inj.id]: (ci ?? []) as CheckIn[] }));
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const generateProtocol = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const prompt = `You are a certified athletic trainer and sports rehabilitation specialist.
A teen athlete has logged the following injury:
- Sport: ${form.sport || "general sport"}
- Body part: ${form.body_part}
- Injury type: ${form.injury_type}
- Severity: ${form.severity}
- Age: ${athleteInfo?.age ?? 16}
- Height/Weight: ${athleteInfo?.height_ft ?? 5}'${athleteInfo?.height_in ?? 8}" / ${athleteInfo?.weight_lbs ?? 150}lbs

Generate a detailed return-to-play protocol with specific daily activities.
Format as JSON exactly:
{
  "estimated_recovery_days": 14,
  "phases": [
    {
      "phase_number": 1,
      "phase_name": "Rest and Reduce Inflammation",
      "duration_days": 3,
      "days": [
        {
          "day": 1,
          "activities": ["Ice 20 minutes every 2 hours", "Elevate leg when sitting", "Gentle ankle circles 2x10"],
          "avoid": ["Running", "Jumping", "Heavy lifting"],
          "goal": "Reduce swelling"
        }
      ]
    }
  ],
  "return_to_play_signs": ["No pain at rest", "Full range of motion", "Can jog without limp"],
  "warning_signs": ["Increased swelling", "Sharp pain", "Numbness"],
  "disclaimer": "This is a general guide. Always follow your doctor or trainer's specific advice."
}

Include 3-5 phases progressing from rest to full return. Be specific with exercises, sets, reps, and durations. Always include a disclaimer.`;

      const resp = await fetch(FN("ace-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], userId: user.id, jsonMode: true }),
      });
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }
      // Extract JSON from SSE stream
      let jsonStr = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("data: ")) {
          try { const d = JSON.parse(line.slice(6)); if (d.content) jsonStr += d.content; } catch { /* skip */ }
        }
      }
      // Extract JSON object from response
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      const protocol: Protocol = JSON.parse(match[0]);

      const returnDate = new Date(form.date_of_injury);
      returnDate.setDate(returnDate.getDate() + protocol.estimated_recovery_days);
      const estimated_return_date = returnDate.toISOString().slice(0, 10);

      const { data, error } = await supabase.from("injuries").insert({
        student_id: user.id,
        sport: form.sport,
        body_part: form.body_part,
        injury_type: form.injury_type,
        severity: form.severity,
        date_of_injury: form.date_of_injury,
        description: form.description,
        cleared_by_doctor: form.cleared_by_doctor,
        protocol_json: protocol,
        estimated_return_date,
        status: "active",
      }).select().single();
      if (error) throw error;
      setInjuries((prev) => [data as Injury, ...prev]);
      setLogOpen(false);
      toast.success("Recovery protocol generated! 💪");
    } catch (e: any) {
      toast.error("Failed to generate protocol", { description: e.message });
    } finally {
      setGenerating(false);
    }
  };

  const submitCheckIn = async (injuryId: string) => {
    if (!user) return;
    const today = todayISO();
    const { data, error } = await supabase.from("recovery_checkins").insert({
      injury_id: injuryId,
      student_id: user.id,
      date: today,
      pain_level: painLevel,
      activities_completed: [],
    }).select().single();
    if (error) { toast.error("Check-in failed"); return; }
    setCheckIns((prev) => ({ ...prev, [injuryId]: [...(prev[injuryId] ?? []), data as CheckIn] }));
    setCheckInOpen(null);
    const msg = painLevel <= 2 ? "Great progress — you can advance to the next phase activity! 🟢"
      : painLevel <= 5 ? "Stay at current phase — don't rush it. 🟡"
      : "Pull back to previous phase and rest — please see a medical professional if pain persists. 🔴";
    toast.info(msg, { duration: 6000 });
  };

  const markRecovered = async (injuryId: string) => {
    if (!user) return;
    const inj = injuries.find((i) => i.id === injuryId);
    if (!inj) return;
    await supabase.from("injuries").update({ status: "recovered" }).eq("id", injuryId);
    setInjuries((prev) => prev.map((i) => i.id === injuryId ? { ...i, status: "recovered" } : i));
    // Award XP
    await supabase.rpc("increment_xp" as any, { p_user_id: user.id, p_amount: 200 });
    setRecoveryOpen(null);
    toast.success("🎉 Welcome back! +200 XP awarded for completing your recovery protocol!");
  };

  const toggleActivity = async (injuryId: string, checkInId: string, activity: string) => {
    const ci = checkIns[injuryId]?.find((c) => c.id === checkInId);
    if (!ci) return;
    const updated = ci.activities_completed.includes(activity)
      ? ci.activities_completed.filter((a) => a !== activity)
      : [...ci.activities_completed, activity];
    await supabase.from("recovery_checkins").update({ activities_completed: updated }).eq("id", checkInId);
    setCheckIns((prev) => ({
      ...prev,
      [injuryId]: prev[injuryId].map((c) => c.id === checkInId ? { ...c, activities_completed: updated } : c),
    }));
  };

  const activeInjuries = injuries.filter((i) => i.status === "active");
  const pastInjuries = injuries.filter((i) => i.status === "recovered");

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">🏥 Recovery</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered comeback protocols for injuries and setbacks</p>
        </div>
        <Button onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Log Injury
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : (
        <>
          {activeInjuries.length === 0 && (
            <div className="rounded-2xl border border-border bg-card/40 p-10 text-center">
              <Heart className="h-10 w-10 mx-auto text-green-400 mb-3" />
              <div className="font-semibold text-lg">No active injuries</div>
              <div className="text-sm text-muted-foreground mt-1">Tap "Log Injury" if you have a setback to track.</div>
            </div>
          )}

          {activeInjuries.map((inj) => {
            const protocol = inj.protocol_json;
            const daysIn = daysBetween(inj.date_of_injury, todayISO());
            const daysLeft = inj.estimated_return_date ? Math.max(0, daysBetween(todayISO(), inj.estimated_return_date)) : null;
            const returnDate = inj.estimated_return_date ? new Date(inj.estimated_return_date + "T12:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric" }) : null;
            const todayCI = checkIns[inj.id]?.find((c) => c.date === todayISO());
            const activePhaseIdx = expandedPhase[inj.id] ?? 0;

            return (
              <div key={inj.id} className="rounded-2xl border border-border bg-card p-5 mb-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold">{inj.body_part} — {inj.injury_type}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold border",
                        inj.severity === "mild" ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : inj.severity === "moderate" ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                      )}>
                        {inj.severity.charAt(0).toUpperCase() + inj.severity.slice(1)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Injured {new Date(inj.date_of_injury + "T12:00:00").toLocaleDateString()} · Day {daysIn + 1} of recovery</div>
                    {inj.description && <div className="text-xs italic text-muted-foreground mt-0.5">"{inj.description}"</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setPainLevel(3); setCheckInOpen(inj.id); }}>
                      <Activity className="h-3.5 w-3.5 mr-1" /> Check In
                    </Button>
                    <Button size="sm" variant="outline" className="text-green-400 border-green-500/30" onClick={() => setRecoveryOpen(inj.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Recovered
                    </Button>
                  </div>
                </div>

                {/* Return date */}
                {returnDate && (
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Projected return</div>
                      <div className="font-bold text-base">{returnDate}</div>
                    </div>
                    {daysLeft !== null && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{daysLeft}</div>
                        <div className="text-xs text-muted-foreground">days to go</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Phase timeline */}
                {protocol && (
                  <>
                    <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                      {protocol.phases.map((phase, idx) => (
                        <button
                          key={idx}
                          onClick={() => setExpandedPhase((p) => ({ ...p, [inj.id]: idx }))}
                          className={cn(
                            "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                            idx === activePhaseIdx
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/60"
                          )}
                        >
                          {idx + 1}. {phase.phase_name}
                        </button>
                      ))}
                      <div className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/30">
                        ✅ Return to Play
                      </div>
                    </div>

                    {/* Active phase days */}
                    {protocol.phases[activePhaseIdx] && (
                      <div className="space-y-3">
                        {protocol.phases[activePhaseIdx].days.map((day) => {
                          const dayCI = todayCI && daysIn + 1 === day.day ? todayCI : null;
                          const done = dayCI ? dayCI.activities_completed.length : 0;
                          return (
                            <div key={day.day} className="rounded-xl border border-border bg-card/40 p-3">
                              <div className="flex items-center gap-3 mb-2">
                                <CompletionRing done={done} total={day.activities.length} />
                                <div>
                                  <div className="font-semibold text-sm">Day {day.day}</div>
                                  <div className="text-xs text-muted-foreground">{day.goal}</div>
                                </div>
                              </div>
                              <div className="space-y-1 mb-2">
                                {day.activities.map((act, i) => {
                                  const checked = dayCI?.activities_completed.includes(act) ?? false;
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => dayCI && toggleActivity(inj.id, dayCI.id, act)}
                                      className={cn("w-full text-left flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 transition-colors",
                                        checked ? "bg-green-500/10 text-green-400" : "hover:bg-muted/40 text-foreground"
                                      )}
                                    >
                                      <span>{checked ? "✅" : "⬜"}</span>
                                      <span>{act}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              {day.avoid.length > 0 && (
                                <div className="text-xs text-red-400 flex flex-wrap gap-1">
                                  <span className="font-semibold">Avoid:</span>
                                  {day.avoid.map((a, i) => <span key={i} className="bg-red-500/10 px-1.5 py-0.5 rounded">{a}</span>)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Return to play signs */}
                    <div className="mt-4 rounded-xl bg-green-500/8 border border-green-500/20 p-3">
                      <div className="text-xs font-semibold text-green-400 mb-1">Return to Play Signs</div>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {protocol.return_to_play_signs.map((s, i) => <li key={i}>✅ {s}</li>)}
                      </ul>
                    </div>

                    {/* Warning signs */}
                    <div className="mt-2 rounded-xl bg-red-500/8 border border-red-500/20 p-3">
                      <div className="text-xs font-semibold text-red-400 mb-1">Warning Signs — See a Doctor</div>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {protocol.warning_signs.map((s, i) => <li key={i}>⚠️ {s}</li>)}
                      </ul>
                    </div>

                    <div className="mt-2 text-[10px] italic text-muted-foreground">{protocol.disclaimer}</div>
                  </>
                )}

                {!inj.cleared_by_doctor && (
                  <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    Always consult a medical professional before following any return-to-play protocol.
                  </div>
                )}
              </div>
            );
          })}

          {/* Past injuries */}
          {pastInjuries.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Injury History</h3>
              <div className="space-y-2">
                {pastInjuries.map((inj) => (
                  <div key={inj.id} className="rounded-xl border border-border bg-card/40 p-3 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{inj.body_part} — {inj.injury_type}</div>
                      <div className="text-xs text-muted-foreground">{new Date(inj.date_of_injury + "T12:00:00").toLocaleDateString()} · Recovered</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">Recovered</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Log injury modal */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>🏥 Log New Injury</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Body Part</Label>
                <Select value={form.body_part} onValueChange={(v) => setForm((f) => ({ ...f, body_part: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BODY_PARTS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Injury Type</Label>
                <Select value={form.injury_type} onValueChange={(v) => setForm((f) => ({ ...f, injury_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INJURY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Severity</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {SEVERITIES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, severity: s.id }))}
                    className={cn("rounded-xl border p-3 text-left transition-colors",
                      form.severity === s.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"
                    )}
                  >
                    <div className={cn("text-sm font-semibold", s.color)}>{s.label}</div>
                    <div className="text-[10px] text-muted-foreground">{s.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date of Injury</Label>
                <Input type="date" value={form.date_of_injury} onChange={(e) => setForm((f) => ({ ...f, date_of_injury: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Sport Affected</Label>
                <Input value={form.sport} onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))} placeholder="e.g. Football" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. twisted my ankle at practice" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cleared"
                checked={form.cleared_by_doctor}
                onChange={(e) => setForm((f) => ({ ...f, cleared_by_doctor: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="cleared" className="text-xs cursor-pointer">Cleared by doctor/trainer</Label>
            </div>
            {!form.cleared_by_doctor && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                Always consult a medical professional before following any return-to-play protocol.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={generateProtocol} disabled={generating}>
              {generating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating protocol…</> : "Generate AI Protocol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily check-in modal */}
      <Dialog open={!!checkInOpen} onOpenChange={(v) => !v && setCheckInOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Daily Check-In</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">How is your {injuries.find((i) => i.id === checkInOpen)?.body_part} feeling today?</Label>
              <div className="text-xs text-muted-foreground mb-3">Rate your pain level</div>
              <div className="px-2">
                <Slider min={0} max={10} step={1} value={[painLevel]} onValueChange={([v]) => setPainLevel(v)} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>0 — No pain</span>
                <span className="font-bold text-foreground text-base">{painLevel}</span>
                <span>10 — Severe</span>
              </div>
            </div>
            <div className={cn("rounded-lg px-3 py-2 text-xs font-medium",
              painLevel <= 2 ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : painLevel <= 5 ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
            )}>
              {painLevel <= 2 ? "🟢 Great progress — you can advance to the next phase activity"
                : painLevel <= 5 ? "🟡 Stay at current phase — don't rush it"
                : "🔴 Pull back to previous phase and rest — please see a medical professional if pain persists"}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInOpen(null)}>Cancel</Button>
            <Button onClick={() => checkInOpen && submitCheckIn(checkInOpen)}>Submit Check-In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recovery completion modal */}
      <Dialog open={!!recoveryOpen} onOpenChange={(v) => !v && setRecoveryOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-400" /> Mark as Recovered?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will mark your injury as fully recovered, award +200 XP, and save it to your injury history. Make sure you are genuinely cleared to return to full activity.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecoveryOpen(null)}>Not yet</Button>
            <Button onClick={() => recoveryOpen && markRecovered(recoveryOpen)} className="bg-green-600 hover:bg-green-700">
              ✅ I'm Recovered — +200 XP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
