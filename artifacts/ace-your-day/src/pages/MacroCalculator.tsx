import { useEffect, useState } from "react";
import { Apple, Loader2, Sparkles, Flame, Beef, Wheat, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchAthletic } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

type Plan = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_oz: number;
  tdee: number;
  bmr: number;
  rationale: string;
  meal_split: { breakfast: number; lunch: number; dinner: number; snacks: number };
  tips: string[];
};

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/macro-calc`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const GOALS = [
  { id: "cut", label: "Cut (lose fat)" },
  { id: "maintain", label: "Maintain" },
  { id: "bulk", label: "Bulk (gain muscle)" },
  { id: "performance", label: "Peak performance" },
];

const MacroCalculator = () => {
  const { user } = useAuth();
  const [age, setAge] = useState("14");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [heightFt, setHeightFt] = useState("5");
  const [heightIn, setHeightIn] = useState("8");
  const [weight, setWeight] = useState("140");
  const [trainingDays, setTrainingDays] = useState("4");
  const [sport, setSport] = useState("");
  const [goal, setGoal] = useState("maintain");
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchAthletic(user.id).then((p) => {
      if (!p) return;
      setAge(String(p.age ?? 14));
      setGender(p.gender);
      setHeightFt(String(p.height_ft ?? 5));
      setHeightIn(String(p.height_in ?? 8));
      setWeight(String(p.weight_lbs ?? 140));
      setTrainingDays(String(p.training_days_per_week ?? 4));
      setSport(p.primary_sports?.[0] ?? "");
    });
  }, [user]);

  const calculate = async () => {
    setLoading(true);
    setPlan(null);
    try {
      const totalIn = (parseInt(heightFt) || 0) * 12 + (parseInt(heightIn) || 0);
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : ANON ? { Authorization: `Bearer ${ANON}` } : {}),
        },
        body: JSON.stringify({
          age: parseInt(age) || 14,
          gender,
          height_in: totalIn,
          weight_lbs: parseInt(weight) || 140,
          training_days_per_week: parseInt(trainingDays) || 3,
          sport,
          goal,
          notes,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error("Slow down — try again in a minute.");
        else if (resp.status === 402) toast.error("Out of AI credits.", { description: err.error });
        else toast.error("Couldn't generate plan.", { description: err.error });
        return;
      }
      const data = (await resp.json()) as Plan;
      if (!data.calories) {
        toast.error("AI returned an invalid plan. Try again.");
        return;
      }
      setPlan(data);
    } catch (e: any) {
      toast.error("Network error", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      <header className="mb-6 flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-sports/15 text-sports flex items-center justify-center">
          <Apple className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Athletic</p>
          <h1 className="text-3xl font-bold">AI Macro Calculator</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Personalized fuel plan for your training and goals.
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Your stats
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Age</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Sex</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Height (ft)</Label>
              <Input type="number" value={heightFt} onChange={(e) => setHeightFt(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Height (in)</Label>
              <Input type="number" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Weight (lbs)</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Training days / week</Label>
            <Input type="number" min={0} max={7} value={trainingDays} onChange={(e) => setTrainingDays(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">Primary sport (optional)</Label>
            <Input placeholder="e.g. Football, Track" value={sport} onChange={(e) => setSport(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">Goal</Label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GOALS.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Notes (allergies, preferences)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. vegetarian, lactose-free"
            />
          </div>

          <Button onClick={calculate} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculating…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Generate plan</>
            )}
          </Button>
        </div>

        {/* Results */}
        <div className="rounded-2xl border border-border bg-card p-5 min-h-[400px]">
          {!plan && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-10">
              <Apple className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm">Fill in your stats and tap <strong>Generate plan</strong>.</p>
            </div>
          )}
          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">AI is crunching your macros…</p>
            </div>
          )}
          {plan && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="text-center pb-3 border-b border-border">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Daily target</div>
                <div className="text-4xl font-bold mt-1 flex items-center justify-center gap-2">
                  <Flame className="h-7 w-7 text-orange-500" />
                  {plan.calories.toLocaleString()}
                  <span className="text-base font-normal text-muted-foreground">kcal</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  BMR {plan.bmr} • TDEE {plan.tdee}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <MacroBox icon={<Beef className="h-4 w-4" />} label="Protein" value={plan.protein_g} color="hsl(0 70% 60%)" />
                <MacroBox icon={<Wheat className="h-4 w-4" />} label="Carbs" value={plan.carbs_g} color="hsl(40 80% 55%)" />
                <MacroBox icon={<Droplet className="h-4 w-4" />} label="Fat" value={plan.fat_g} color="hsl(200 70% 55%)" />
              </div>

              <div className="rounded-lg bg-muted/50 px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Droplet className="h-3.5 w-3.5 text-blue-400" /> Water
                </span>
                <span className="font-bold text-sm">{plan.water_oz} oz</span>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Meal split</div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {(["breakfast", "lunch", "dinner", "snacks"] as const).map((m) => (
                    <div key={m} className="rounded-md bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m}</div>
                      <div className="font-bold text-sm">{plan.meal_split?.[m] ?? 0}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3">
                {plan.rationale}
              </div>

              {plan.tips?.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Coach tips</div>
                  <ul className="space-y-1">
                    {plan.tips.map((t, i) => (
                      <li key={i} className="text-xs flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const MacroBox = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => (
  <div className="rounded-lg border border-border bg-background/40 p-3 text-center" style={{ borderTopColor: color, borderTopWidth: 2 }}>
    <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
      {icon} {label}
    </div>
    <div className="text-lg font-bold mt-1">{value}<span className="text-xs font-normal text-muted-foreground">g</span></div>
  </div>
);

export default MacroCalculator;