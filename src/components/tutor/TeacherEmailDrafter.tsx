import { useEffect, useState } from "react";
import { Loader2, Copy, RefreshCw, Pencil, ChevronDown, ChevronUp, Mail, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const FN = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

const SUBJECTS = [
  "Math", "English/Language Arts", "Science", "Social Studies", "History",
  "Georgia Studies", "Spanish", "Art", "PE", "Other",
];

const TONES = [
  { id: "friendly", label: "😊 Friendly and Polite" },
  { id: "formal", label: "🎓 Formal and Professional" },
  { id: "casual", label: "💬 Casual but Respectful" },
];

const QUICK_SCENARIOS = [
  { label: "I need an extension 📅", text: "I need to ask for an extension on the assignment because " },
  { label: "I missed class 🤒", text: "I missed class today because I was sick and wanted to check what I missed." },
  { label: "I don't understand something 🤔", text: "I'm having trouble understanding " },
  { label: "I think there's a grading error ✏️", text: "I think there might be a grading error on my recent test/assignment. I wanted to ask about question " },
  { label: "I have a question about the assignment ❓", text: "I have a question about the assignment that's due " },
  { label: "I'll miss class for a sport 🏃", text: "I'll be missing class on [date] for a [sport] competition and wanted to let you know in advance." },
];

type EmailDraft = {
  subject_line: string;
  body: string;
  tone_used: string;
};

type SavedEmail = {
  id: string;
  subject: string;
  teacher_name: string;
  email_subject_line: string;
  email_body: string;
  created_at: string;
  raw_input: string;
};

export const TeacherEmailDrafter = ({
  open,
  onClose,
  defaultSubject = "",
}: {
  open: boolean;
  onClose: () => void;
  defaultSubject?: string;
}) => {
  const { user } = useAuth();
  const [teacherName, setTeacherName] = useState("");
  const [subject, setSubject] = useState(defaultSubject || SUBJECTS[0]);
  const [rawInput, setRawInput] = useState("");
  const [tone, setTone] = useState("friendly");
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [savedEmails, setSavedEmails] = useState<SavedEmail[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (defaultSubject) setSubject(defaultSubject);
  }, [defaultSubject]);

  const generate = async (regenerate = false) => {
    if (!user || !rawInput.trim()) {
      toast.error("Please describe what you want to say to your teacher.");
      return;
    }
    setGenerating(true);
    setDraft(null);
    setEditing(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: prefs } = await supabase.from("user_preferences").select("first_name").eq("user_id", user.id).maybeSingle();
      const { data: academic } = await supabase.from("academic_profiles" as any).select("*").eq("user_id", user.id).maybeSingle();
      const firstName = (prefs as any)?.first_name ?? "Student";
      const grade = (academic as any)?.grade ?? "8th grade";

      const toneName = TONES.find((t) => t.id === tone)?.label.replace(/^[^\s]+ /, "") ?? "Friendly and Polite";

      const prompt = `You are helping an 8th grade student write a professional, respectful email to their teacher.

Student info:
- Name: ${firstName}
- Subject: ${subject}
- Teacher: ${teacherName || "their teacher"}
- Grade in this class: ${grade}

The student wants to say: "${rawInput}"
Tone requested: ${toneName}
${regenerate ? "Write a fresh version with different wording than before." : ""}

Write a complete email including:
- Subject line
- Greeting
- Body (2-3 sentences max — teachers are busy)
- Polite closing
- Student's name

Rules:
- Sound like a student wrote it — not an adult
- Be genuine and respectful not robotic
- If asking for something (extension, retake, etc) briefly acknowledge responsibility
- Never be sycophantic or overly formal
- Keep it SHORT — under 100 words in the body

Return as JSON only (no markdown, no extra text):
{
  "subject_line": "Question About Last Week's Assignment",
  "body": "full email text here",
  "tone_used": "${toneName}"
}`;

      const resp = await fetch(FN("ace-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], userId: user.id }),
      });
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      let jsonStr = "";
      for (const line of text.split("\n")) {
        if (line.startsWith("data: ")) {
          try { const d = JSON.parse(line.slice(6)); if (d.content) jsonStr += d.content; } catch { /* skip */ }
        }
      }
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      const result: EmailDraft = JSON.parse(match[0]);
      setDraft(result);
      setEditedBody(result.body);

      // Save to Supabase
      await supabase.from("teacher_emails" as any).insert({
        user_id: user.id,
        subject,
        teacher_name: teacherName,
        email_subject_line: result.subject_line,
        email_body: result.body,
        raw_input: rawInput,
        tone_used: tone,
      });
    } catch (e: any) {
      toast.error("Failed to generate email", { description: e.message });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    const body = editing ? editedBody : draft?.body ?? "";
    const text = `Subject: ${draft?.subject_line}\n\n${body}`;
    navigator.clipboard.writeText(text);
    toast.success("Email copied to clipboard!");
  };

  const loadHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("teacher_emails" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setSavedEmails((data ?? []) as unknown as SavedEmail[]);
    setHistoryLoading(false);
    setHistoryOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> ✉️ Email Teacher
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick scenarios */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">Quick scenarios</div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SCENARIOS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setRawInput(s.text)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted/70 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Teacher Name (optional)</Label>
              <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Mr. Johnson" />
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">What do you want to say?</Label>
            <Textarea
              rows={3}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="e.g. twisted my ankle at practice and need to miss class tomorrow"
            />
          </div>

          {/* Tone selector */}
          <div>
            <Label className="text-xs mb-1.5 block">Tone</Label>
            <div className="flex gap-2 flex-wrap">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors",
                    tone === t.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/40"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={() => generate(false)} disabled={generating || !rawInput.trim()} className="w-full">
            {generating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Drafting email…</> : "✉️ Draft Email"}
          </Button>

          {/* Draft result */}
          <AnimatePresence>
            {draft && !generating && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card/60 p-4 space-y-3"
              >
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Subject</div>
                <div className="font-semibold text-sm">{draft.subject_line}</div>
                <div className="border-t border-border pt-3">
                  {editing ? (
                    <Textarea
                      rows={8}
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      className="text-sm font-mono"
                    />
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{draft.body}</pre>
                  )}
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button size="sm" variant="outline" onClick={copyToClipboard}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => generate(true)} disabled={generating}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditing(!editing); if (!editing) setEditedBody(draft.body); }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> {editing ? "Done" : "Edit"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email history */}
          <div>
            <button
              type="button"
              onClick={loadHistory}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              📂 Past Emails
              {historyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            <AnimatePresence>
              {historyOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2 overflow-hidden"
                >
                  {historyLoading && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
                  {!historyLoading && savedEmails.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-3">No past emails yet.</div>
                  )}
                  {savedEmails.map((email) => (
                    <details key={email.id} className="rounded-lg border border-border bg-card/40 px-3 py-2 text-xs">
                      <summary className="cursor-pointer font-medium flex items-center justify-between">
                        <span>{email.email_subject_line}</span>
                        <span className="text-muted-foreground ml-2 flex-shrink-0">
                          {new Date(email.created_at).toLocaleDateString()}
                        </span>
                      </summary>
                      <div className="mt-2 text-muted-foreground">
                        <div className="mb-1"><span className="font-medium">To:</span> {email.teacher_name || "Teacher"} · {email.subject}</div>
                        <pre className="whitespace-pre-wrap font-sans leading-relaxed">{email.email_body}</pre>
                      </div>
                    </details>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
