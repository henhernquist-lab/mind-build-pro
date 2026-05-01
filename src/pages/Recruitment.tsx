import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, Plus, Trash2, ExternalLink, Mail, Phone, Calendar,
  CheckCircle2, Circle, Loader2, ArrowLeft, Star, MessageSquare, Sparkles, Target, TrendingUp, School,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listColleges, createCollege, updateCollege, deleteCollege,
  listContacts, createContact, deleteContact,
  listTasksForCollege, createTask, toggleTask, deleteTask,
  listMilestones, createMilestone, deleteMilestone,
  STATUSES,
  type College, type CollegeStatus, type RecruitmentContact,
  type RecruitmentTask, type RecruitmentMilestone, type MilestoneType,
} from "@/lib/recruitment/api";

const STATUS_META = STATUSES.reduce<Record<string, { label: string; color: string }>>((acc, s) => {
  acc[s.value] = { label: s.label, color: s.color };
  return acc;
}, {});

const Recruitment = () => {
  const { user } = useAuth();
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<CollegeStatus | "all">("all");

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    setColleges(await listColleges(user.id));
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  const filtered = useMemo(
    () => filter === "all" ? colleges : colleges.filter((c) => c.status === filter),
    [colleges, filter],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: colleges.length };
    for (const s of STATUSES) m[s.value] = colleges.filter((c) => c.status === s.value).length;
    return m;
  }, [colleges]);

  const opened = colleges.find((c) => c.id === openId);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Recruitment</p>
          <h1 className="text-3xl font-black mt-1 flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            College Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track every school, coach, application, and visit in one place.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add College
        </Button>
      </header>

      {colleges.length > 0 && <RecruitmentDashboard colleges={colleges} />}

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={counts.all} />
        {STATUSES.map((s) => (
          <FilterChip
            key={s.value}
            active={filter === s.value}
            onClick={() => setFilter(s.value)}
            label={s.label}
            count={counts[s.value] || 0}
            color={s.color}
          />
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-bold">No colleges yet</h2>
          <p className="text-sm text-muted-foreground mt-1">Add your first target school to start tracking.</p>
          <Button onClick={() => setAddOpen(true)} className="mt-4">
            <Plus className="h-4 w-4 mr-1" /> Add College
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => {
            const meta = STATUS_META[c.status];
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setOpenId(c.id)}
                className="text-left rounded-2xl border border-border bg-card p-4 hover:border-primary transition-colors"
                style={{ borderLeft: `4px solid ${meta.color}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold truncate">{c.name}</div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 6 - c.priority }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {[c.division, c.sport, c.location].filter(Boolean).join(" • ") || "No details yet"}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${meta.color}22`, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  {c.match_score != null && (
                    <span className={cn(
                      "text-[11px] font-black px-2 py-0.5 rounded-full",
                      c.match_score >= 75 ? "bg-emerald-500/20 text-emerald-500"
                      : c.match_score >= 50 ? "bg-amber-500/20 text-amber-500"
                      : "bg-rose-500/20 text-rose-500",
                    )}>
                      {c.match_score}% match
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <AddCollegeDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); refresh(); }}
      />

      {opened && (
        <CollegeDetail
          college={opened}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
};

const FilterChip = ({
  active, onClick, label, count, color,
}: { active: boolean; onClick: () => void; label: string; count: number; color?: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "text-xs font-bold px-3 py-1.5 rounded-full border transition-colors",
      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground",
    )}
    style={active && color ? { borderColor: color, background: `${color}22`, color } : undefined}
  >
    {label} <span className="opacity-60">({count})</span>
  </button>
);

/* ======================== Add College ======================== */

const AddCollegeDialog = ({
  open, onClose, onSaved,
}: { open: boolean; onClose: () => void; onSaved: () => void }) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [division, setDivision] = useState("");
  const [sport, setSport] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<CollegeStatus>("interested");
  const [priority, setPriority] = useState(3);
  const [avgGpa, setAvgGpa] = useState("");
  const [satMin, setSatMin] = useState("");
  const [actMin, setActMin] = useState("");
  const [athleticLevel, setAthleticLevel] = useState("");

  const save = async () => {
    if (!user || !name.trim()) return;
    await createCollege({
      user_id: user.id, name: name.trim(), division, sport, location, website,
      status, priority,
      academic_avg_gpa: avgGpa ? Number(avgGpa) : null,
      sat_min: satMin ? Number(satMin) : null,
      act_min: actMin ? Number(actMin) : null,
      athletic_level: athleticLevel || null,
    } as any);
    setName(""); setDivision(""); setSport(""); setLocation(""); setWebsite("");
    setStatus("interested"); setPriority(3);
    setAvgGpa(""); setSatMin(""); setActMin(""); setAthleticLevel("");
    toast.success("College added");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add College</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="School name *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="University of Georgia" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Division"><Input value={division} onChange={(e) => setDivision(e.target.value)} placeholder="D1" /></Field>
            <Field label="Sport"><Input value={sport} onChange={(e) => setSport(e.target.value)} placeholder="Football" /></Field>
          </div>
          <Field label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Athens, GA" /></Field>
          <Field label="Website"><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Avg GPA"><Input type="number" step="0.01" placeholder="3.7" value={avgGpa} onChange={(e) => setAvgGpa(e.target.value)} /></Field>
            <Field label="SAT min"><Input type="number" placeholder="1300" value={satMin} onChange={(e) => setSatMin(e.target.value)} /></Field>
            <Field label="ACT min"><Input type="number" placeholder="28" value={actMin} onChange={(e) => setActMin(e.target.value)} /></Field>
          </div>
          <Field label="Athletic level (D1, D2, D3, NAIA, JUCO)">
            <Input value={athleticLevel} onChange={(e) => setAthleticLevel(e.target.value)} placeholder="D1" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as CollegeStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority (1=top)">
              <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

/* ======================== Detail Drawer ======================== */

const CollegeDetail = ({
  college, onClose, onChanged,
}: { college: College; onClose: () => void; onChanged: () => void }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<RecruitmentContact[]>([]);
  const [tasks, setTasks] = useState<RecruitmentTask[]>([]);
  const [milestones, setMilestones] = useState<RecruitmentMilestone[]>([]);
  const [status, setStatus] = useState<CollegeStatus>(college.status);
  const [notes, setNotes] = useState(college.notes ?? "");
  const [loading, setLoading] = useState(true);

  // Add forms
  const [newContact, setNewContact] = useState({ name: "", role: "", email: "", phone: "" });
  const [newTask, setNewTask] = useState({ title: "", due_date: "" });
  const [newMilestone, setNewMilestone] = useState<{ event_type: MilestoneType; title: string; description: string; occurred_on: string }>({
    event_type: "note", title: "", description: "", occurred_on: new Date().toISOString().slice(0, 10),
  });

  const reload = async () => {
    setLoading(true);
    const [cs, ts, ms] = await Promise.all([
      listContacts(college.id), listTasksForCollege(college.id), listMilestones(college.id),
    ]);
    setContacts(cs); setTasks(ts); setMilestones(ms);
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [college.id]);

  const persist = async (patch: Partial<College>) => {
    await updateCollege(college.id, patch);
    onChanged();
  };

  const addContact = async () => {
    if (!user || !newContact.name.trim()) return;
    await createContact({
      user_id: user.id, college_id: college.id,
      name: newContact.name.trim(), role: newContact.role || null,
      email: newContact.email || null, phone: newContact.phone || null,
      notes: null, last_contacted: null,
    });
    setNewContact({ name: "", role: "", email: "", phone: "" });
    reload();
  };

  const addTask = async () => {
    if (!user || !newTask.title.trim()) return;
    await createTask({
      user_id: user.id, college_id: college.id,
      title: newTask.title.trim(), notes: null,
      due_date: newTask.due_date || null, completed: false,
    });
    setNewTask({ title: "", due_date: "" });
    reload();
  };

  const addMilestone = async () => {
    if (!user || !newMilestone.title.trim()) return;
    await createMilestone({
      user_id: user.id, college_id: college.id,
      event_type: newMilestone.event_type,
      title: newMilestone.title.trim(),
      description: newMilestone.description || null,
      occurred_on: newMilestone.occurred_on,
    });
    setNewMilestone({ event_type: "note", title: "", description: "", occurred_on: new Date().toISOString().slice(0, 10) });
    reload();
  };

  const remove = async () => {
    if (!confirm(`Remove ${college.name}? This deletes all linked contacts, tasks, and milestones.`)) return;
    await deleteCollege(college.id);
    toast.success("College removed");
    onClose();
    onChanged();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <button onClick={onClose} className="md:hidden p-1 -ml-1 hover:bg-muted rounded">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="truncate">{college.name}</span>
            {college.website && (
              <a href={college.website} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground -mt-2">
          {[college.division, college.sport, college.location].filter(Boolean).join(" • ") || "No details"}
        </div>

        {/* Status & quick actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v as CollegeStatus); persist({ status: v as CollegeStatus }); }}>
              <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={remove} className="text-destructive ml-auto">
            <Trash2 className="h-4 w-4 mr-1" /> Remove
          </Button>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="overview" className="mt-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.filter((t) => !t.completed).length})</TabsTrigger>
              <TabsTrigger value="timeline">Timeline ({milestones.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 pt-3">
              <MatchScoreCard college={college} onUpdated={onChanged} />
              <Field label="Notes">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => persist({ notes })}
                  rows={6}
                  placeholder="Coach offered phone call, campus visit booked for Oct 15..."
                />
              </Field>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-3 pt-3">
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add Contact</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Name *" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
                  <Input placeholder="Role (Head Coach, Recruiter)" value={newContact.role} onChange={(e) => setNewContact({ ...newContact, role: e.target.value })} />
                  <Input placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
                  <Input placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
                </div>
                <Button size="sm" onClick={addContact} disabled={!newContact.name.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No contacts yet</p>
              ) : contacts.map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{c.name}</div>
                    {c.role && <div className="text-xs text-muted-foreground">{c.role}</div>}
                    <div className="flex flex-wrap gap-3 mt-1 text-xs">
                      {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-primary hover:underline"><Mail className="h-3 w-3" /> {c.email}</a>}
                      {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-primary hover:underline"><Phone className="h-3 w-3" /> {c.phone}</a>}
                    </div>
                    <CoachOutreachButton collegeId={college.id} contactId={c.id} contactName={c.name} contactEmail={c.email} />
                  </div>
                  <button onClick={async () => { await deleteContact(c.id); reload(); }} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-3 pt-3">
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add Task</div>
                <div className="grid grid-cols-[1fr_140px] gap-2">
                  <Input placeholder="Send transcript to coach..." value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
                  <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} />
                </div>
                <Button size="sm" onClick={addTask} disabled={!newTask.title.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
              ) : tasks.map((t) => (
                <div key={t.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                  <button onClick={async () => { await toggleTask(t.id, !t.completed); reload(); }}>
                    {t.completed
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm", t.completed && "line-through text-muted-foreground")}>{t.title}</div>
                    {t.due_date && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" /> {new Date(t.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <button onClick={async () => { await deleteTask(t.id); reload(); }} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-3 pt-3">
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Log Event</div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newMilestone.event_type} onValueChange={(v) => setNewMilestone({ ...newMilestone, event_type: v as MilestoneType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">📝 Note</SelectItem>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="call">📞 Call</SelectItem>
                      <SelectItem value="visit">🏫 Campus Visit</SelectItem>
                      <SelectItem value="application">📄 Application</SelectItem>
                      <SelectItem value="offer">🏆 Offer</SelectItem>
                      <SelectItem value="commitment">✅ Commitment</SelectItem>
                      <SelectItem value="rejection">❌ Rejection</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={newMilestone.occurred_on} onChange={(e) => setNewMilestone({ ...newMilestone, occurred_on: e.target.value })} />
                </div>
                <Input placeholder="Title (e.g. 'Coach Smith called')" value={newMilestone.title} onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })} />
                <Textarea rows={2} placeholder="Details (optional)" value={newMilestone.description} onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })} />
                <Button size="sm" onClick={addMilestone} disabled={!newMilestone.title.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Log
                </Button>
              </div>

              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No events logged yet</p>
              ) : (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                  {milestones.map((m) => (
                    <div key={m.id} className="relative mb-3 group">
                      <div className="absolute -left-[18px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                      <div className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              {m.event_type} • {new Date(m.occurred_on).toLocaleDateString()}
                            </div>
                            <div className="font-semibold text-sm mt-0.5">{m.title}</div>
                            {m.description && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{m.description}</div>}
                          </div>
                          <button onClick={async () => { await deleteMilestone(m.id); reload(); }} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Recruitment;

/* ======================== Recruitment Dashboard ======================== */

const RecruitmentDashboard = ({ colleges }: { colleges: College[] }) => {
  const scored = colleges.filter((c) => c.match_score != null);
  const avg = scored.length ? Math.round(scored.reduce((s, c) => s + (c.match_score || 0), 0) / scored.length) : 0;
  const competitive = scored.filter((c) => (c.match_score || 0) >= 75).length;
  const top = [...scored].sort((a, b) => (b.match_score || 0) - (a.match_score || 0))[0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <StatTile icon={School} label="Schools tracked" value={colleges.length.toString()} />
      <StatTile icon={Target} label="Avg match" value={scored.length ? `${avg}%` : "—"} />
      <StatTile icon={TrendingUp} label="Competitive (75%+)" value={competitive.toString()} />
      <StatTile icon={Star} label="Top match" value={top ? `${top.match_score}%` : "—"} sub={top?.name} />
    </div>
  );
};

const StatTile = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
  <div className="rounded-2xl border border-border bg-card p-3">
    <div className="flex items-center gap-2 text-muted-foreground text-xs">
      <Icon className="h-3.5 w-3.5" />
      <span className="uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-2xl font-black mt-1">{value}</div>
    {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
  </div>
);

/* ======================== Match Score Card ======================== */

const MatchScoreCard = ({ college, onUpdated }: { college: College; onUpdated: () => void }) => {
  const [loading, setLoading] = useState(false);

  const compute = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("recruitment-match", {
      body: { college_id: college.id },
    });
    setLoading(false);
    if (error) { toast.error("Couldn't compute match"); return; }
    toast.success(`Match: ${data?.score}%`);
    onUpdated();
  };

  const score = college.match_score;
  const tone = score == null ? "muted" : score >= 75 ? "emerald" : score >= 50 ? "amber" : "rose";
  const toneClass = tone === "emerald" ? "text-emerald-500" : tone === "amber" ? "text-amber-500" : tone === "rose" ? "text-rose-500" : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <Target className="h-3 w-3" /> Fit Match
          </div>
          <div className={cn("text-3xl font-black mt-0.5", toneClass)}>
            {score != null ? `${score}%` : "—"}
          </div>
          {college.match_summary && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{college.match_summary}</p>
          )}
          {college.match_breakdown && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(college.match_breakdown as Record<string, any>).map(([k, v]) => (
                <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {k} {v.score}
                </span>
              ))}
            </div>
          )}
        </div>
        <Button size="sm" onClick={compute} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> {score != null ? "Recompute" : "Compute"}</>}
        </Button>
      </div>
    </div>
  );
};

/* ======================== Coach Outreach Button ======================== */

const CoachOutreachButton = ({ collegeId, contactId, contactName, contactEmail }: { collegeId: string; contactId: string; contactName: string; contactEmail: string | null }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const draft = async () => {
    setOpen(true);
    setLoading(true);
    setSubject(""); setBody("");
    const { data, error } = await supabase.functions.invoke("coach-outreach", {
      body: { college_id: collegeId, contact_id: contactId },
    });
    setLoading(false);
    if (error) { toast.error("Draft failed"); return; }
    setSubject(data?.subject ?? "");
    setBody(data?.body ?? "");
  };

  const sendEmail = () => {
    const url = `mailto:${contactEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
  };

  return (
    <>
      <Button size="sm" variant="ghost" onClick={draft} className="mt-2 h-7 text-xs">
        <Sparkles className="h-3 w-3 mr-1" /> Draft email
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Email to {contactName}</DialogTitle></DialogHeader>
          {loading ? (
            <div className="py-10 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
              <Field label="Body"><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="font-mono text-xs" /></Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={sendEmail} disabled={!contactEmail || loading}>
              <Mail className="h-4 w-4 mr-1" /> Open in mail app
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};