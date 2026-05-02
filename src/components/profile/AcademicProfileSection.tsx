import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AcademicProfile, AcademicClass,
  fetchAcademicProfile, saveAcademicProfile,
  fetchClasses, insertClass, updateClass, deleteClass,
  STUDY_STYLES, ACADEMIC_GOAL_OPTIONS, HOMEWORK_LOADS, DIFFICULTIES, LETTER_GRADES,
  computeStrongest, computeWeakest,
} from "@/lib/academic";
import { GRADE_OPTIONS } from "@/lib/profile";
import { useAuth } from "@/lib/auth";

const DEFAULT_PROFILE: AcademicProfile = {
  grade_level: null, gpa: null, gpa_weighted: false,
  strongest_subject: null, strongest_subject_override: false,
  needs_improvement: null, needs_improvement_override: false,
  academic_goals: [], study_style: null, study_hours_per_day: 1, homework_load: null,
};

export const AcademicProfileSection = ({
  onChanged,
}: { onChanged?: (p: AcademicProfile, classes: AcademicClass[]) => void }) => {
  const { user } = useAuth();
  const [p, setP] = useState<AcademicProfile>(DEFAULT_PROFILE);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ap = await fetchAcademicProfile(user.id);
      if (ap) setP(ap);
      const cls = await fetchClasses(user.id);
      setClasses(cls);
      onChanged?.(ap ?? DEFAULT_PROFILE, cls);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-calc strongest/needs unless overridden
  useEffect(() => {
    setP((cur) => {
      const next = { ...cur };
      if (!cur.strongest_subject_override) next.strongest_subject = computeStrongest(classes);
      if (!cur.needs_improvement_override) next.needs_improvement = computeWeakest(classes);
      return next;
    });
  }, [classes]);

  useEffect(() => { onChanged?.(p, classes); /* eslint-disable-next-line */ }, [p, classes]);

  const toggleGoal = (g: string) =>
    setP((cur) => ({ ...cur, academic_goals: cur.academic_goals.includes(g) ? cur.academic_goals.filter((x) => x !== g) : [...cur.academic_goals, g] }));

  const addRow = async () => {
    if (!user) return;
    const c = { class_name: "New Class", period: "", teacher: "", current_grade: null, current_grade_pct: null, difficulty: "Standard", sort_order: classes.length };
    const row = await insertClass(user.id, c);
    setClasses((cl) => [...cl, { ...c, id: (row as any).id }]);
  };

  const removeRow = async (id: string) => {
    await deleteClass(id);
    setClasses((cl) => cl.filter((c) => c.id !== id));
  };

  const patchRow = (id: string, patch: Partial<AcademicClass>) => {
    setClasses((cl) => cl.map((c) => c.id === id ? { ...c, ...patch } : c));
  };

  const persistRow = async (id: string) => {
    const c = classes.find((x) => x.id === id);
    if (!c) return;
    await updateClass(id, c);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveAcademicProfile(user.id, p);
      // persist any pending row edits
      await Promise.all(classes.map((c) => updateClass(c.id, c)));
      toast.success("Academic profile saved");
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-sm">🎓</div>
        <h2 className="text-lg font-semibold">Academic Profile</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Current grade level</Label>
          <Select value={p.grade_level ?? ""} onValueChange={(v) => setP({ ...p, grade_level: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">GPA</Label>
          <Input type="number" step="0.01" min={0} max={5} value={p.gpa ?? ""} onChange={(e) => setP({ ...p, gpa: e.target.value === "" ? null : parseFloat(e.target.value) })} placeholder="3.8" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={p.gpa_weighted} onCheckedChange={(v) => setP({ ...p, gpa_weighted: v })} />
            Weighted GPA
          </label>
        </div>
      </div>

      {/* Classes */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <Label className="text-xs">Class schedule</Label>
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-3.5 w-3.5 mr-1" /> Add class</Button>
        </div>
        <div className="space-y-2">
          {classes.length === 0 && (<p className="text-xs text-muted-foreground italic">No classes yet — add one to personalize your AI tutor.</p>)}
          {classes.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-background/50 p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <Input className="md:col-span-3" value={c.class_name} onChange={(e) => patchRow(c.id, { class_name: e.target.value })} onBlur={() => persistRow(c.id)} placeholder="Class name" />
              <Input className="md:col-span-2" value={c.period ?? ""} onChange={(e) => patchRow(c.id, { period: e.target.value })} onBlur={() => persistRow(c.id)} placeholder="Period" />
              <Input className="md:col-span-2" value={c.teacher ?? ""} onChange={(e) => patchRow(c.id, { teacher: e.target.value })} onBlur={() => persistRow(c.id)} placeholder="Teacher" />
              <Select value={c.current_grade ?? ""} onValueChange={(v) => { patchRow(c.id, { current_grade: v }); setTimeout(() => persistRow(c.id), 0); }}>
                <SelectTrigger className="md:col-span-1"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{LETTER_GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={c.difficulty} onValueChange={(v) => { patchRow(c.id, { difficulty: v }); setTimeout(() => persistRow(c.id), 0); }}>
                <SelectTrigger className="md:col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="icon" variant="ghost" onClick={() => removeRow(c.id)} className="md:col-span-1 justify-self-end">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Strongest / Needs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div>
          <Label className="text-xs flex items-center justify-between">
            Strongest subject
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Switch checked={p.strongest_subject_override} onCheckedChange={(v) => setP({ ...p, strongest_subject_override: v })} />
              Override
            </label>
          </Label>
          <Input value={p.strongest_subject ?? ""} disabled={!p.strongest_subject_override} onChange={(e) => setP({ ...p, strongest_subject: e.target.value })} placeholder="Auto from highest grade" />
        </div>
        <div>
          <Label className="text-xs flex items-center justify-between">
            Needs improvement
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Switch checked={p.needs_improvement_override} onCheckedChange={(v) => setP({ ...p, needs_improvement_override: v })} />
              Override
            </label>
          </Label>
          <Input value={p.needs_improvement ?? ""} disabled={!p.needs_improvement_override} onChange={(e) => setP({ ...p, needs_improvement: e.target.value })} placeholder="Auto from lowest grade" />
        </div>
      </div>

      {/* Goals */}
      <div className="mt-5">
        <Label className="text-xs">Academic goals</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
          {ACADEMIC_GOAL_OPTIONS.map((g) => (
            <label key={g} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm", p.academic_goals.includes(g) ? "border-primary bg-primary/10" : "border-border hover:bg-accent")}>
              <Checkbox checked={p.academic_goals.includes(g)} onCheckedChange={() => toggleGoal(g)} />
              {g}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div>
          <Label className="text-xs">Study style</Label>
          <Select value={p.study_style ?? ""} onValueChange={(v) => setP({ ...p, study_style: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{STUDY_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Homework load</Label>
          <Select value={p.homework_load ?? ""} onValueChange={(v) => setP({ ...p, homework_load: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{HOMEWORK_LOADS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex justify-between items-center mb-2">
          <Label className="text-xs">Average study hours per day</Label>
          <span className="text-sm font-bold">{p.study_hours_per_day} h</span>
        </div>
        <Slider min={0} max={6} step={0.5} value={[p.study_hours_per_day]} onValueChange={(v) => setP({ ...p, study_hours_per_day: v[0] })} />
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          Save academic profile
        </Button>
      </div>
    </section>
  );
};
