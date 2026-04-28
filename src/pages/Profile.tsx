import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Camera, Download, Link2, Save, Share2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AthleticInfo, fetchAthletic, saveAthletic, savePersonal,
  uploadAvatar, checkUsernameAvailable, initialsFromName,
  SPORT_OPTIONS, GOAL_OPTIONS, GRADE_OPTIONS, EXPERIENCE_OPTIONS,
} from "@/lib/profile";
import { fetchPrefs, savePrefs, fetchUserStats } from "@/lib/workouts";
import { AthleteCard } from "@/components/profile/AthleteCard";
import { AcademicCard } from "@/components/profile/AcademicCard";
import { AcademicProfileSection } from "@/components/profile/AcademicProfileSection";
import { RankCountdown } from "@/components/profile/RankCountdown";
import { useRank } from "@/lib/ranks2";
import { useState as useStateAcademic } from "react";
import html2canvas from "html2canvas";

const slugifyUsername = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const athleticRank = useRank("athletic");
  const academicRank = useRank("academic");
  const [academicData, setAcademicData] = useStateAcademic<{ p: any; classes: any[] }>({ p: null, classes: [] });

  // Personal
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [grade, setGrade] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Athletic
  const [athletic, setAthletic] = useState<AthleticInfo>({
    age: 13, height_ft: 5, height_in: 6, weight_lbs: 120, gender: "male",
    primary_sports: [], other_sport: "", position_event: "",
    years_experience: "", fitness_goals: [], training_days_per_week: 3,
    injuries: "",
  });
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [totalXp, setTotalXp] = useState(0);

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingAthletic, setSavingAthletic] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    setDisplayName(profile.display_name || "");
    setBio(profile.bio || "");
    setGrade(profile.grade || "");
    setSchoolName(profile.school_name || "");
    setUsername(profile.username || "");
    setAvatarUrl(profile.avatar_url || null);
  }, [user?.id, profile?.display_name, profile?.avatar_url]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const a = await fetchAthletic(user.id);
      if (a) setAthletic(a);
      const prefs = await fetchPrefs(user.id);
      setWeightUnit(prefs.weight_unit);
      const stats = await fetchUserStats(user.id);
      setTotalXp(stats.xp);
    })();
  }, [user?.id]);

  // Username availability check (debounced)
  useEffect(() => {
    if (!user) return;
    const cleaned = slugifyUsername(username);
    if (!cleaned || cleaned === (profile?.username || "")) {
      setUsernameAvailable(null);
      return;
    }
    const t = setTimeout(async () => {
      const ok = await checkUsernameAvailable(cleaned, user.id);
      setUsernameAvailable(ok);
    }, 350);
    return () => clearTimeout(t);
  }, [username, user?.id, profile?.username]);

  const onAvatarChange = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      await savePersonal(user.id, { avatar_url: url });
      setAvatarUrl(url);
      await refreshProfile();
      toast.success("Photo updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const savePersonalInfo = async () => {
    if (!user) return;
    const cleaned = slugifyUsername(username);
    if (cleaned && cleaned !== (profile?.username || "")) {
      const ok = await checkUsernameAvailable(cleaned, user.id);
      if (!ok) {
        toast.error("Username already taken");
        return;
      }
    }
    setSavingPersonal(true);
    try {
      await savePersonal(user.id, {
        display_name: displayName.trim(),
        bio: bio.trim().slice(0, 300),
        grade,
        school_name: schoolName.trim(),
        username: cleaned,
      });
      setUsername(cleaned);
      await refreshProfile();
      toast.success("Personal info saved");
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
    } finally {
      setSavingPersonal(false);
    }
  };

  const saveAthleticInfo = async () => {
    if (!user) return;
    setSavingAthletic(true);
    try {
      await saveAthletic(user.id, athletic);
      toast.success("Athletic profile saved");
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
    } finally {
      setSavingAthletic(false);
    }
  };

  const toggleSport = (s: string) => {
    setAthletic((a) => ({
      ...a,
      primary_sports: a.primary_sports.includes(s)
        ? a.primary_sports.filter((x) => x !== s)
        : [...a.primary_sports, s],
    }));
  };

  const toggleGoal = (g: string) => {
    setAthletic((a) => ({
      ...a,
      fitness_goals: a.fitness_goals.includes(g)
        ? a.fitness_goals.filter((x) => x !== g)
        : [...a.fitness_goals, g],
    }));
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `${(displayName || "athlete").replace(/\s+/g, "_")}_card.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Card downloaded");
    } catch (e: any) {
      toast.error("Couldn't render card");
    }
  };

  const copyShareLink = async () => {
    const u = profile?.username;
    if (!u) {
      toast.error("Set a username first to enable sharing");
      return;
    }
    const url = `${window.location.origin}/athlete/${u}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied", { description: url });
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  // Live card data (uses unsaved values for instant preview)
  const cardData = {
    displayName: displayName || profile?.display_name || user?.email?.split("@")[0] || "Athlete",
    username: username || profile?.username,
    avatarUrl,
    grade,
    schoolName,
    bio,
    age: athletic.age,
    heightFt: athletic.height_ft,
    heightIn: athletic.height_in,
    weightLbs: athletic.weight_lbs,
    primarySports: athletic.primary_sports,
    otherSport: athletic.other_sport,
    positionEvent: athletic.position_event,
    yearsExperience: athletic.years_experience,
    fitnessGoals: athletic.fitness_goals,
    totalXp,
  };

  const initials = initialsFromName(displayName || "?");

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto pb-24">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Profile</p>
        <h1 className="text-3xl font-bold mt-1">Your Athlete Hub</h1>
      </header>

      {/* Live Athlete Card */}
      <div className="mb-8">
        <AthleteCard ref={cardRef} data={cardData} />
        <div className="mt-3 flex flex-wrap gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={downloadCard}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download PNG
          </Button>
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            <Link2 className="h-3.5 w-3.5 mr-1.5" /> Copy share link
          </Button>
        </div>
      </div>

      {/* Personal Info */}
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-sm">👤</div>
          <h2 className="text-lg font-semibold">Personal Info</h2>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div
              className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold border-2 border-border"
              style={{ background: avatarUrl ? "transparent" : "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                : initials}
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-background/70 rounded-full flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <Label className="text-xs">Profile picture</Label>
            <p className="text-[11px] text-muted-foreground mb-2">PNG/JPG, max 5 MB. Used in sidebar + share card.</p>
            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer rounded-md border border-border px-3 py-1.5 hover:bg-accent">
              <Camera className="h-3.5 w-3.5" />
              <span>{avatarUrl ? "Change photo" : "Upload photo"}</span>
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onAvatarChange(e.target.files[0])}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} placeholder="Marcus" />
          </div>
          <div>
            <Label className="text-xs">Username (for share URL)</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(slugifyUsername(e.target.value))}
              maxLength={24}
              placeholder="marcus23"
            />
            <div className="text-[11px] mt-1 h-4">
              {username && usernameAvailable === false && (
                <span className="text-destructive">✗ Already taken</span>
              )}
              {username && usernameAvailable === true && (
                <span className="text-primary">✓ Available — share at /athlete/{username}</span>
              )}
              {!username && (
                <span className="text-muted-foreground">Pick one to enable public sharing</span>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">Grade</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">School name (optional)</Label>
            <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} maxLength={100} placeholder="Lincoln Middle" />
          </div>
          <div className="md:col-span-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Bio</Label>
              <span className={cn("text-[10px]", bio.length > 280 ? "text-destructive" : "text-muted-foreground")}>
                {bio.length}/300
              </span>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 300))}
              maxLength={300}
              rows={3}
              placeholder="8th grader, track & football, I code Python and want to go D1"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={savePersonalInfo} disabled={savingPersonal}>
            {savingPersonal ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save personal info
          </Button>
        </div>
      </section>

      {/* Athletic Profile */}
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-sports/15 flex items-center justify-center text-sm" style={{ color: "hsl(var(--sports))" }}>🏋️</div>
          <h2 className="text-lg font-semibold">Athletic Profile</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Age</Label>
            <Input
              type="number" min={5} max={25}
              value={athletic.age}
              onChange={(e) => setAthletic((a) => ({ ...a, age: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label className="text-xs">Gender</Label>
            <Select value={athletic.gender} onValueChange={(v) => setAthletic((a) => ({ ...a, gender: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Height</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number" min={3} max={7}
                value={athletic.height_ft}
                onChange={(e) => setAthletic((a) => ({ ...a, height_ft: parseInt(e.target.value) || 0 }))}
                placeholder="ft"
              />
              <Input
                type="number" min={0} max={11}
                value={athletic.height_in}
                onChange={(e) => setAthletic((a) => ({ ...a, height_in: parseInt(e.target.value) || 0 }))}
                placeholder="in"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Weight</Label>
              <div className="inline-flex rounded-full border border-border p-0.5 text-[10px] font-semibold">
                {(["lbs", "kg"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={async () => {
                      setWeightUnit(u);
                      if (user) await savePrefs(user.id, { weight_unit: u });
                    }}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full uppercase",
                      weightUnit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <Input
              type="number" step="1"
              value={weightUnit === "lbs" ? athletic.weight_lbs : Math.round(athletic.weight_lbs / 2.205)}
              onChange={(e) => {
                const v = parseFloat(e.target.value) || 0;
                const lbs = weightUnit === "lbs" ? v : v * 2.205;
                setAthletic((a) => ({ ...a, weight_lbs: Math.round(lbs) }));
              }}
            />
          </div>
        </div>

        {/* Sports */}
        <div className="mt-5">
          <Label className="text-xs">Primary sport(s)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
            {SPORT_OPTIONS.map((s) => (
              <label
                key={s}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm",
                  athletic.primary_sports.includes(s) ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
                )}
              >
                <Checkbox
                  checked={athletic.primary_sports.includes(s)}
                  onCheckedChange={() => toggleSport(s)}
                />
                {s}
              </label>
            ))}
          </div>
          {athletic.primary_sports.includes("Other") && (
            <Input
              className="mt-2"
              value={athletic.other_sport}
              onChange={(e) => setAthletic((a) => ({ ...a, other_sport: e.target.value }))}
              placeholder="Specify other sport"
              maxLength={40}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div>
            <Label className="text-xs">Position / Event</Label>
            <Input
              value={athletic.position_event}
              onChange={(e) => setAthletic((a) => ({ ...a, position_event: e.target.value }))}
              placeholder="Wide Receiver / 400m"
              maxLength={60}
            />
          </div>
          <div>
            <Label className="text-xs">Years of experience</Label>
            <Select value={athletic.years_experience} onValueChange={(v) => setAthletic((a) => ({ ...a, years_experience: v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {EXPERIENCE_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Goals */}
        <div className="mt-5">
          <Label className="text-xs">Fitness goals</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
            {GOAL_OPTIONS.map((g) => (
              <label
                key={g}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm",
                  athletic.fitness_goals.includes(g) ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
                )}
              >
                <Checkbox
                  checked={athletic.fitness_goals.includes(g)}
                  onCheckedChange={() => toggleGoal(g)}
                />
                {g}
              </label>
            ))}
          </div>
        </div>

        {/* Training days slider */}
        <div className="mt-5">
          <div className="flex justify-between items-center mb-2">
            <Label className="text-xs">Training days per week</Label>
            <span className="text-sm font-bold">{athletic.training_days_per_week}</span>
          </div>
          <Slider
            min={1} max={7} step={1}
            value={[athletic.training_days_per_week]}
            onValueChange={(v) => setAthletic((a) => ({ ...a, training_days_per_week: v[0] }))}
          />
        </div>

        <div className="mt-5">
          <Label className="text-xs flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Injuries or limitations (optional)
          </Label>
          <Textarea
            value={athletic.injuries}
            onChange={(e) => setAthletic((a) => ({ ...a, injuries: e.target.value.slice(0, 200) }))}
            rows={2}
            placeholder="e.g. Recovering from sprained ankle — avoid jumping"
          />
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={saveAthleticInfo} disabled={savingAthletic}>
            {savingAthletic ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save athletic profile
          </Button>
        </div>
      </section>

      {/* Share section */}
      <section className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Share2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Share My Card</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Download as PNG or share a public read-only link with coaches and friends.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={downloadCard} size="sm">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download PNG
          </Button>
          <Button onClick={copyShareLink} size="sm" variant="outline">
            <Link2 className="h-3.5 w-3.5 mr-1.5" /> Copy Share Link
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Profile;