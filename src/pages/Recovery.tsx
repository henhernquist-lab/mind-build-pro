import { useEffect, useState } from "react";
import { Plus, Loader2, CheckCircle2, AlertTriangle, Trophy, Heart, Activity, Calendar, FileText, ChevronRight, ChevronDown } from "lucide-react";
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
import { BodySilhouette } from "@/components/recovery/BodySilhouette";

const FN = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

const BODY_PARTS = ["Head/Neck", "Shoulder (L)", "Shoulder (R)", "Elbow (L)", "Elbow (R)", "Wrist (L)", "Wrist (R)", "Back (Upper/Lower)", "Hip (L)", "Hip (R)", "Knee (L)", "Knee (R)", "Ankle (L)", "Ankle (R)", "Foot (L)", "Foot (R)", "Other"];
const INJURY_TYPES = ["Strain", "Sprain", "Soreness", "Tendinitis", "Fracture", "Post-Surgery", "Other"];
const SEVERITIES = [
  { id: "mild", label: "Mild", sub: "Still can train lightly", color: "text-amber-400" },
  { id: "moderate", label: "Moderate", sub: "Limited activity", color: "text-orange-400" },
  { id: "severe", label: "Severe", sub: "Complete rest", color: "text-red-400" },
];

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
        stroke={pct >= 1 ? "#22C55E" : "#00E5FF"}
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
  const [injuries, setInjuries] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState<string | null>(null);
  const [painLevel, setPainLevel] = useState(3);
  const [expandedPhase, setExpandedPhase] = useState<Record<string, number>>({});
  const [recoveryOpen, setRecoveryOpen] = useState<string | null>(null);

  const [form, setForm] = useState({
    body_part: "",
    injury_type: "Sprain",
    severity: "mild",
    date_of_injury: todayISO(),
    description: "",
    cleared_by_doctor: false,
    sport: "",
  });

  const [athleteInfo, setAthleteInfo] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [ath, { data: inj }] = await Promise.all([
        fetchAthletic(user.id),
        supabase.from("injuries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (ath) {
        setAthleteInfo(ath);
        setForm((f) => ({ ...f, sport: (ath.primary_sports ?? []).join(", ") }));
      }
      const injuriesList = (inj ?? []) as any[];
      setInjuries(injuriesList);
      for (const injItem of injuriesList.filter((i) => i.status === "active")) {
        const { data: ci } = await supabase.from("recovery_checkins").select("*").eq("injury_id", injItem.id).order("date", { ascending: true });
        setCheckIns((prev) => ({ ...prev, [injItem.id]: (ci ?? []) }));
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const generateProtocol = async () => {
    if (!user || !form.body_part) return;
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const prompt = `You are a certified athletic trainer for teen athletes.
Generate a return-to-play protocol for this injury:
Athlete: Age ${athleteInfo?.age ?? 16}, Sport: ${form.sport}, Position: ${athleteInfo?.position_event}
Injury: ${form.injury_type} to ${form.body_part}, Severity: ${form.severity}

Return ONLY valid JSON:
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
          "activities": [
            "Ice 20 minutes every 2-3 hours",
            "Elevate the injured area when resting",
            "Gentle range of motion movements 2x10"
          ],
          "avoid": ["Running", "Jumping", "Heavy lifting"],
          "goal": "Reduce swelling and pain"
        }
      ]
    }
  ],
  "return_to_play_signs": [
    "No pain at rest",
    "Full range of motion restored",
    "Can perform sport-specific movements without pain"
  ],
  "warning_signs": [
    "Increased swelling after activity",
    "Sharp or shooting pain",
    "Numbness or tingling"
  ],
  "disclaimer": "This is general guidance only. Always follow advice from your doctor, athletic trainer, or physical therapist."
}`;

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

      let jsonStr = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("data: ")) {
          try { const d = JSON.parse(line.slice(6)); if (d.content) jsonStr += d.content; } catch { /* skip */ }
        }
      }

      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      const protocol = JSON.parse(match[0]);

      const returnDate = new Date(form.date_of_injury);
      returnDate.setDate(returnDate.getDate() + protocol.estimated_recovery_days);

      const { data, error } = await supabase.from("injuries").insert({
        user_id: user.id,
        sport: form.sport,
        body_part: form.body_part,
        injury_type: form.injury_type,
        severity: form.severity,
        date_of_injury: form.date_of_injury,
        description: form.description,
        cleared_by_doctor: form.cleared_by_doctor,
        protocol_json: protocol,
        estimated_return_date: returnDate.toISOString().slice(0, 10),
        status: "active",
      }).select().single();

      if (error) throw error;
      setInjuries((prev) => [data, ...prev]);
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
    const { data, error } = await supabase.from("recovery_checkins").insert({
      injury_id: injuryId,
      user_id: user.id,
      date: todayISO(),
      pain_level: painLevel,
      activities_completed: [],
    }).select().single();

    if (error) { toast.error("Check-in failed"); return; }
    setCheckIns((prev) => ({ ...prev, [injuryId]: [...(prev[injuryId] ?? []), data] }));
    setCheckInOpen(null);

    const msg = painLevel <= 2 ? "Great progress — consider advancing to next phase activities"
      : painLevel <= 5 ? "Stay at current phase — don't rush recovery"
      : "Pull back to previous phase. If pain persists please see a medical professional";
    toast.info(msg, { duration: 6000 });
  };

  const toggleActivity = async (injuryId: string, checkInId: string, activity: string) => {
    const ci = checkIns[injuryId]?.find((c) => c.id === checkInId);
    if (!ci) return;
    const updated = ci.activities_completed.includes(activity)
      ? ci.activities_completed.filter((a: string) => a !== activity)
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">🏥 RECOVERY</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered injury rehabilitation protocols</p>
        </div>
        <Button onClick={() => setLogOpen(true)} className="rounded-full bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-black">
          <Plus className="h-4 w-4 mr-1.5" /> LOG INJURY
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-64 rounded-3xl bg-accent/20" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {activeInjuries.length === 0 && (
            <div className="rounded-3xl border-2 border-dashed border-border bg-card/40 p-12 text-center">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
              <div className="font-black text-xl text-muted-foreground">NO ACTIVE INJURIES</div>
              <p className="text-sm text-muted-foreground mt-2">You're cleared for full activity. Stay safe!</p>
            </div>
          )}

          {activeInjuries.map((inj) => {
            const protocol = inj.protocol_json;
            const daysIn = daysBetween(inj.date_of_injury, todayISO());
            const daysLeft = inj.estimated_return_date ? daysBetween(todayISO(), inj.estimated_return_date) : 0;
            const activePhaseIdx = expandedPhase[inj.id] ?? 0;
            const todayCI = checkIns[inj.id]?.find((c) => c.date === todayISO());

            return (
              <div key={inj.id} className="rounded-3xl border-2 border-border bg-card overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-black uppercase tracking-tight">{inj.body_part}</span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-black uppercase border",
                          inj.severity === "mild" ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : inj.severity === "moderate" ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                        )}>
                          {inj.severity}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" /> Injured {new Date(inj.date_of_injury).toLocaleDateString()}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setCheckInOpen(inj.id)} className="rounded-full font-bold">
                      <Activity className="h-3.5 w-3.5 mr-1.5" /> Check In
                    </Button>
                  </div>

                  {/* Return Countdown */}
                  <div className="bg-[#00E5FF]/10 rounded-2xl p-4 flex items-center justify-between border border-[#00E5FF]/20">
                    <div>
                      <div className="text-[10px] font-black uppercase text-[#00E5FF] tracking-widest">Projected Return</div>
                      <div className="text-lg font-black">{new Date(inj.estimated_return_date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-[#00E5FF]">{daysLeft}</div>
                      <div className="text-[10px] font-black uppercase text-muted-foreground">Days Remaining</div>
                    </div>
                  </div>

                  {/* Phase Timeline */}
                  {protocol && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        {protocol.phases.map((p: any, idx: number) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 relative">
                            {idx < protocol.phases.length - 1 && (
                              <div className={cn("absolute top-3 left-1/2 w-full h-0.5", idx < activePhaseIdx ? "bg-[#00E5FF]" : "bg-muted")} />
                            )}
                            <button
                              onClick={() => setExpandedPhase(prev => ({ ...prev, [inj.id]: idx }))}
                              className={cn(
                                "h-6 w-6 rounded-full z-10 flex items-center justify-center text-[10px] font-black transition-all",
                                idx === activePhaseIdx ? "bg-[#00E5FF] text-black scale-125" :
                                idx < activePhaseIdx ? "bg-[#00E5FF] text-black" : "bg-muted text-muted-foreground"
                              )}
                            >
                              {idx < activePhaseIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                            </button>
                            <span className={cn("text-[8px] font-black uppercase text-center", idx === activePhaseIdx ? "text-foreground" : "text-muted-foreground")}>
                              Phase {idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Daily Activities */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activePhaseIdx}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-3"
                        >
                          <div className="font-black text-sm uppercase text-muted-foreground flex justify-between">
                            <span>{protocol.phases[activePhaseIdx].phase_name}</span>
                            <span className="text-[#00E5FF]">{protocol.phases[activePhaseIdx].duration_days} Days</span>
                          </div>

                          {protocol.phases[activePhaseIdx].days.map((day: any) => {
                            const isToday = daysIn + 1 === day.day;
                            const currentCI = todayCI && isToday ? todayCI : null;
                            const done = currentCI ? currentCI.activities_completed.length : 0;

                            return (
                              <Card key={day.day} className={cn("p-4 border-none bg-accent/10", isToday && "ring-2 ring-[#00E5FF]/50")}>
                                <div className="flex items-center gap-3 mb-3">
                                  <CompletionRing done={done} total={day.activities.length} />
                                  <div>
                                    <div className="font-black text-sm uppercase">Day {day.day}</div>
                                    <div className="text-xs text-muted-foreground">{day.goal}</div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {day.activities.map((act: string, i: number) => {
                                    const checked = currentCI?.activities_completed.includes(act);
                                    return (
                                      <button
                                        key={i}
                                        disabled={!isToday}
                                        onClick={() => currentCI && toggleActivity(inj.id, currentCI.id, act)}
                                        className={cn(
                                          "w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3",
                                          checked ? "bg-green-500/20 text-green-400" : "bg-background/50 hover:bg-background"
                                        )}
                                      >
                                        <div className={cn("h-4 w-4 rounded border-2 flex items-center justify-center", checked ? "bg-green-500 border-green-500" : "border-muted-foreground/30")}>
                                          {checked && <CheckCircle2 className="h-3 w-3 text-black" />}
                                        </div>
                                        {act}
                                      </button>
                                    );
                                  })}
                                </div>
                                {day.avoid.length > 0 && (
                                  <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-bold flex items-center gap-2">
                                    <AlertTriangle className="h-3 w-3" />
                                    AVOID: {day.avoid.join(", ")}
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Injury Dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl">
          <div className="p-6 bg-accent/20 border-b">
            <h2 className="text-2xl font-black italic">MEDICAL INCIDENT REPORT</h2>
          </div>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              <Label className="text-xs font-black uppercase text-muted-foreground">Where does it hurt?</Label>
              <BodySilhouette
                selected={form.body_part}
                onSelect={(id) => setForm(f => ({ ...f, body_part: id }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-muted-foreground">Injury Type</Label>
                <Select value={form.injury_type} onValueChange={(v) => setForm(f => ({ ...f, injury_type: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{INJURY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-muted-foreground">Date Occurred</Label>
                <Input type="date" value={form.date_of_injury} onChange={e => setForm(f => ({ ...f, date_of_injury: e.target.value }))} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">Severity Level</Label>
              <div className="grid grid-cols-3 gap-2">
                {SEVERITIES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setForm(f => ({ ...f, severity: s.id }))}
                    className={cn(
                      "p-3 rounded-2xl border-2 text-left transition-all",
                      form.severity === s.id ? "border-[#00E5FF] bg-[#00E5FF]/10" : "border-border hover:bg-accent/30"
                    )}
                  >
                    <div className={cn("font-black text-sm", s.color)}>{s.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{s.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="How did it happen? (e.g. twisted ankle landing from a layup)"
                className="rounded-2xl"
              />
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent/10">
              <input
                type="checkbox"
                id="cleared"
                checked={form.cleared_by_doctor}
                onChange={e => setForm(f => ({ ...f, cleared_by_doctor: e.target.checked }))}
                className="h-5 w-5 rounded border-2 border-[#00E5FF] text-[#00E5FF] focus:ring-0"
              />
              <Label htmlFor="cleared" className="text-xs font-bold cursor-pointer">Cleared by medical professional</Label>
            </div>

            {!form.cleared_by_doctor && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Always consult a doctor before following any return-to-play protocol.
              </div>
            )}
          </div>
          <DialogFooter className="p-6 bg-accent/10 border-t">
            <Button variant="ghost" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={generateProtocol} disabled={generating || !form.body_part} className="bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-black px-8">
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              GENERATE RECOVERY PLAN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pain Check-in Dialog */}
      <Dialog open={!!checkInOpen} onOpenChange={v => !v && setCheckInOpen(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic">DAILY PAIN CHECK-IN</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <Label className="text-sm font-bold">Pain level on a scale of 0-10</Label>
              <Slider
                min={0}
                max={10}
                step={1}
                value={[painLevel]}
                onValueChange={([v]) => setPainLevel(v)}
                className="py-4"
              />
              <div className="flex justify-between text-xs font-black">
                <span className="text-green-500 uppercase">No Pain</span>
                <span className="text-4xl text-[#00E5FF] font-mono">{painLevel}</span>
                <span className="text-red-500 uppercase">Severe</span>
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border-2 flex gap-3",
              painLevel <= 2 ? "border-green-500/50 bg-green-500/10" :
              painLevel <= 5 ? "border-amber-500/50 bg-amber-500/10" :
              "border-red-500/50 bg-red-500/10"
            )}>
              <Activity className={cn("h-5 w-5 shrink-0", painLevel <= 2 ? "text-green-500" : painLevel <= 5 ? "text-amber-500" : "text-red-500")} />
              <div className="text-xs font-bold leading-relaxed">
                {painLevel <= 2 ? "Great progress — consider advancing to next phase activities" :
                 painLevel <= 5 ? "Stay at current phase — don't rush recovery" :
                 "Pull back to previous phase. If pain persists please see a medical professional"}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => checkInOpen && submitCheckIn(checkInOpen)} className="w-full h-12 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-black">
              SUBMIT CHECK-IN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
