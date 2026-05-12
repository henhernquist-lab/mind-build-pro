import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles, User, Camera, Dumbbell, GraduationCap, Calendar, ArrowRight, Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sfx } from "@/lib/sounds";
import { toast } from "sonner";

type Step = {
  id: string;
  icon: any;
  title: string;
  desc: string;
  accent: string;
};

const STEPS: Step[] = [
  { id: "welcome", icon: Sparkles, title: "Welcome to LifeStack", desc: "The all-in-one app for stacking your athletic and academic wins. Let's set you up in 90 seconds.", accent: "primary" },
  { id: "name", icon: User, title: "What should we call you?", desc: "This name shows up on your profile and leaderboards.", accent: "school" },
  { id: "photo", icon: Camera, title: "Add a profile photo", desc: "Optional — but it makes your card pop. You can add it later from Profile.", accent: "primary" },
  { id: "athletic", icon: Dumbbell, title: "Athletic profile", desc: "Add your sport, position, and PRs from the Profile page after onboarding to start earning XP.", accent: "sports" },
  { id: "academic", icon: GraduationCap, title: "Pick your subjects", desc: "Add your classes from Profile so the AI Tutor and Vocab Builder know what you're studying.", accent: "school" },
  { id: "first-block", icon: Calendar, title: "Plan your first block", desc: "Open the Daily Planner and add a 30-min study or workout block. Completing blocks earns XP.", accent: "primary" },
];

const accentHsl = (a: string) =>
  a === "sports" ? "hsl(var(--sports))" : a === "school" ? "hsl(var(--school))" : "hsl(var(--primary))";

export const OnboardingFlow = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        await supabase.from("user_preferences").insert({ user_id: user.id });
        setShow(true);
      } else if (!(data as any).onboarding_completed) {
        setShow(true);
      }
      if (profile?.display_name) setName(profile.display_name);
    })();
    return () => { cancelled = true; };
  }, [user, profile?.display_name]);

  if (!show) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    if (name && name !== profile?.display_name) {
      await supabase.from("profiles").upsert({ user_id: user.id, display_name: name });
      await refreshProfile();
    }
    await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, onboarding_completed: true });
    sfx.rankUp();
    toast.success("You're all set 🎉");
    setSaving(false);
    setShow(false);
  };

  const next = () => {
    if (step === 1 && !name.trim()) {
      toast.error("Pick a name first");
      return;
    }
    sfx.click();
    if (last) finish();
    else setStep((s) => s + 1);
  };

  const skip = async () => {
    if (!user) return;
    await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, onboarding_completed: true });
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-scale-in"
        style={{ boxShadow: `0 30px 80px -20px ${accentHsl(s.accent)}40` }}
      >
        {/* Accent gradient header */}
        <div
          className="h-1.5"
          style={{ background: `linear-gradient(90deg, ${accentHsl(s.accent)}, hsl(var(--primary)))` }}
        />

        <div className="p-8 space-y-5">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{
              background: `linear-gradient(135deg, ${accentHsl(s.accent)}30, ${accentHsl(s.accent)}10)`,
              border: `1px solid ${accentHsl(s.accent)}60`,
            }}
          >
            <s.icon className="h-8 w-8" style={{ color: accentHsl(s.accent) }} />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
          </div>

          {step === 1 && (
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or username"
              className="text-center text-lg"
              maxLength={30}
            />
          )}

          {step === 2 && (
            <div className="text-center text-xs text-muted-foreground">
              You can upload a photo from <span className="font-semibold text-foreground">Profile</span> after this.
            </div>
          )}

          {step === 3 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { navigate("/profile"); skip(); }}
            >
              Open Profile to add athletic info
            </Button>
          )}

          {step === 4 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { navigate("/profile"); skip(); }}
            >
              Open Profile to add classes
            </Button>
          )}

          {step === 5 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { navigate("/"); finish(); }}
            >
              Take me to the Planner
            </Button>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6" : i < step ? "w-1.5" : "w-1.5"
                }`}
                style={{
                  background: i <= step ? accentHsl(s.accent) : "hsl(var(--muted))",
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={skip} className="text-muted-foreground">
              Skip
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
              )}
              <Button onClick={next} disabled={saving} className="press">
                {last ? <><Check className="h-4 w-4 mr-1" /> Finish</> : <>Next <ArrowRight className="h-4 w-4 ml-1" /></>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
