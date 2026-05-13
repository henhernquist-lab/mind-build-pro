import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Brain, Loader2, Plus, Sparkles, Trash2, ArrowRight, ArrowLeft, Check, X,
  Trophy, AlertTriangle, Lightbulb, RefreshCw, Flag, Clock, FileText,
  Youtube, Upload, Type, BarChart2, BookOpen, ChevronLeft, ChevronRight,
  Star, Zap, Target,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSubjects } from "@/lib/subjects";
import {
  generateTest, saveTest, listTests, deleteTest,
  recordAttempt, getRecommendation, updateSubjectWeakness,
  getFlaggedSubjects, dismissFlag, setTutorPrefill, listAttempts, awardQuizXP,
  gradeShortAnswers,
  type PracticeQuestion, type PracticeTest, type AnswerRecord, type SubjectWeakness, type QuestionType,
} from "@/lib/practice/api";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";

type Stage = "list" | "create" | "taking" | "results";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  short_answer: "Short Answer",
  fill_blank: "Fill in the Blank",
  vocab_match: "Vocabulary Match",
};

const QUESTION_TYPE_ICONS: Record<QuestionType, string> = {
  multiple_choice: "🔘",
  true_false: "✅",
  short_answer: "✍️",
  fill_blank: "📝",
  vocab_match: "🔗",
};

const getLetterGrade = (pct: number) => {
  if (pct >= 97) return { grade: "A+", color: "text-emerald-400" };
  if (pct >= 93) return { grade: "A", color: "text-emerald-400" };
  if (pct >= 90) return { grade: "A-", color: "text-emerald-400" };
  if (pct >= 87) return { grade: "B+", color: "text-blue-400" };
  if (pct >= 83) return { grade: "B", color: "text-blue-400" };
  if (pct >= 80) return { grade: "B-", color: "text-blue-400" };
  if (pct >= 77) return { grade: "C+", color: "text-amber-400" };
  if (pct >= 73) return { grade: "C", color: "text-amber-400" };
  if (pct >= 70) return { grade: "C-", color: "text-amber-400" };
  if (pct >= 67) return { grade: "D+", color: "text-orange-400" };
  if (pct >= 60) return { grade: "D", color: "text-orange-400" };
  return { grade: "F", color: "text-destructive" };
};

const PracticeTests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const subjects = useSubjects();

  const [stage, setStage] = useState<Stage>("list");
  const [tests, setTests] = useState<PracticeTest[]>([]);
  const [flagged, setFlagged] = useState<SubjectWeakness[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyTab, setHistoryTab] = useState<"tests" | "history">("tests");
  const [attempts, setAttempts] = useState<any[]>([]);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const [t, f, a] = await Promise.all([
      listTests(user.id),
      getFlaggedSubjects(user.id),
      listAttempts(user.id),
    ]);
    setTests(t); setFlagged(f); setAttempts(a);
    setLoading(false);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  // Active test state
  const [activeTest, setActiveTest] = useState<PracticeTest | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [lastResult, setLastResult] = useState<{
    correct: number; total: number; pct: number; weakTopics: string[];
    duration: number; recommendation: string | null; flagged: boolean; subject: string;
    answers: AnswerRecord[]; xpEarned: number; letterGrade: string;
  } | null>(null);

  const startTest = (test: PracticeTest) => {
    setActiveTest(test);
    setAnswers(test.questions.map((_, i) => ({
      question_index: i,
      topic: test.questions[i].topic,
      selected_index: null,
      text_answer: "",
      correct: false,
    })));
    setQIndex(0);
    setFlaggedQuestions(new Set());
    setStartedAt(Date.now());
    setStage("taking");
  };

  const submitTest = async () => {
    if (!activeTest || !user) return;
    const duration = Math.round((Date.now() - startedAt) / 1000);

    // Grade short_answer questions via AI first
    const shortAnswerIndices = activeTest.questions
      .map((q, i) => (q.type === "short_answer" ? i : -1))
      .filter((i) => i !== -1);
    let shortAnswerGrades: { score: number; feedback: string; model_answer: string }[] = [];
    if (shortAnswerIndices.length > 0) {
      const saQuestions = shortAnswerIndices.map((i) => activeTest.questions[i]);
      const saAnswers = shortAnswerIndices.map((i) => answers[i]?.text_answer ?? "");
      shortAnswerGrades = await gradeShortAnswers(activeTest.subject, saQuestions, saAnswers);
    }

    // Grade all answers
    const gradedAnswers: AnswerRecord[] = activeTest.questions.map((q, i) => {
      const ans = answers[i];
      let correct = false;
      let score: number | undefined;
      let feedback: string | undefined;
      let model_answer: string | undefined;
      if (q.type === "multiple_choice" || q.type === "true_false") {
        correct = ans.selected_index === q.correct_index;
      } else if (q.type === "fill_blank") {
        const userAns = (ans.text_answer ?? "").trim().toLowerCase();
        const expected = (q.blank_answer ?? "").trim().toLowerCase();
        correct = userAns === expected || userAns.includes(expected) || expected.includes(userAns);
      } else if (q.type === "short_answer") {
        const saIdx = shortAnswerIndices.indexOf(i);
        const grade = saIdx >= 0 ? shortAnswerGrades[saIdx] : null;
        score = grade?.score ?? 50;
        feedback = grade?.feedback;
        model_answer = grade?.model_answer;
        correct = (score ?? 0) >= 70;
      } else if (q.type === "vocab_match") {
        // Grade vocab_match by comparing student's definition to the model answer
        const userAns = (ans.text_answer ?? "").trim().toLowerCase();
        const expected = (q.definition ?? q.model_answer ?? "").trim().toLowerCase();
        const userWords = new Set(userAns.split(/\s+/).filter((w) => w.length > 3));
        const expectedWords = expected.split(/\s+/).filter((w) => w.length > 3);
        const overlap = expectedWords.filter((w) => userWords.has(w)).length;
        correct = userAns.length > 0 && (overlap >= Math.max(1, Math.floor(expectedWords.length * 0.4)));
      }
      return { ...ans, correct, ...(score !== undefined ? { score } : {}), ...(feedback ? { feedback } : {}), ...(model_answer ? { model_answer } : {}) };
    });

    const correct = gradedAnswers.filter((r) => r.correct).length;
    const total = gradedAnswers.length;
    const pct = Math.round((correct / total) * 100);
    const weakTopicsSet = new Set<string>();
    gradedAnswers.forEach((r) => { if (!r.correct) weakTopicsSet.add(r.topic); });
    const weakTopics = Array.from(weakTopicsSet);

    await recordAttempt({
      user_id: user.id,
      test_id: activeTest.id,
      subject: activeTest.subject,
      score_pct: pct,
      correct_count: correct,
      total_count: total,
      duration_seconds: duration,
      answers: gradedAnswers,
      weak_topics: weakTopics,
    });

    const flaggedNow = await updateSubjectWeakness(user.id, activeTest.subject, pct);
    const recommendation = await getRecommendation(activeTest.subject, pct, weakTopics);
    const xpEarned = await awardQuizXP(user.id, pct);
    const { grade: letterGrade } = getLetterGrade(pct);

    setLastResult({
      correct, total, pct, weakTopics, duration, recommendation,
      flagged: flaggedNow, subject: activeTest.subject, answers: gradedAnswers,
      xpEarned, letterGrade,
    });
    setStage("results");
    refresh();
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">AI Practice Tests</p>
        <h1 className="text-3xl font-black mt-1 flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          Practice Tests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI generates custom quizzes from topics, notes, YouTube videos, or uploaded files.
        </p>
      </header>

      {/* Weakness banners */}
      {flagged.length > 0 && stage === "list" && (
        <div className="space-y-2 mb-5">
          {flagged.map((f) => (
            <WeaknessBanner
              key={f.id}
              flag={f}
              onDismiss={async () => { await dismissFlag(f.id); refresh(); }}
              onReview={() => {
                setTutorPrefill({
                  subject: f.subject,
                  reason: `You scored below 70% on ${f.subject} twice in a row — let's run a focused review.`,
                });
                navigate("/tutor");
              }}
            />
          ))}
        </div>
      )}

      {stage === "list" && (
        <div>
          {/* Tab strip */}
          <div className="flex gap-1 mb-4 bg-muted/40 rounded-xl p-1 w-fit">
            <button
              onClick={() => setHistoryTab("tests")}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors", historyTab === "tests" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <BookOpen className="h-3.5 w-3.5 inline mr-1.5" />My Tests
            </button>
            <button
              onClick={() => setHistoryTab("history")}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors", historyTab === "history" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <BarChart2 className="h-3.5 w-3.5 inline mr-1.5" />Quiz History
            </button>
          </div>

          {historyTab === "tests" ? (
            <ListView
              tests={tests}
              loading={loading}
              onCreate={() => setStage("create")}
              onStart={startTest}
              onDelete={async (id) => { await deleteTest(id); refresh(); }}
            />
          ) : (
            <HistoryView attempts={attempts} loading={loading} />
          )}
        </div>
      )}

      {stage === "create" && (
        <CreateView
          subjects={subjects.map((s) => s.label)}
          onCancel={() => setStage("list")}
          onCreated={(test) => { refresh(); startTest(test); }}
        />
      )}

      {stage === "taking" && activeTest && (
        <TakingView
          test={activeTest}
          qIndex={qIndex}
          answers={answers}
          flaggedQuestions={flaggedQuestions}
          setAnswer={(i, v) => setAnswers((a) => a.map((x, idx) => idx === i ? { ...x, ...v } : x))}
          toggleFlag={(i) => setFlaggedQuestions((prev) => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
          })}
          onPrev={() => setQIndex((i) => Math.max(0, i - 1))}
          onNext={() => setQIndex((i) => Math.min(activeTest.questions.length - 1, i + 1))}
          onJump={(i) => setQIndex(i)}
          onSubmit={submitTest}
          onExit={() => { setStage("list"); setActiveTest(null); }}
          startedAt={startedAt}
          timeLimit={activeTest.time_limit ?? null}
          onTimeUp={submitTest}
        />
      )}

      {stage === "results" && lastResult && activeTest && (
        <ResultsView
          result={lastResult}
          test={activeTest}
          onRetry={() => startTest(activeTest)}
          onNew={() => { setStage("create"); setActiveTest(null); setLastResult(null); }}
          onBack={() => { setStage("list"); setActiveTest(null); setLastResult(null); }}
          onTutor={() => {
            setTutorPrefill({
              subject: lastResult.subject,
              topic: lastResult.weakTopics[0],
              reason: lastResult.recommendation ?? undefined,
            });
            navigate("/tutor");
          }}
        />
      )}
    </div>
  );
};

/* ======================== Weakness Banner ======================== */
const WeaknessBanner = ({
  flag, onDismiss, onReview,
}: { flag: SubjectWeakness; onDismiss: () => void; onReview: () => void }) => (
  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <div className="font-bold text-sm">
        You've scored below 70% on <span className="text-amber-500">{flag.subject}</span> twice in a row
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        Last scores: {flag.last_two_scores.map((s) => `${s}%`).join(" → ")}. Want the AI Tutor to run a focused review?
      </div>
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={onReview}>Yes, start review</Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
      </div>
    </div>
  </div>
);

/* ======================== List View ======================== */
const ListView = ({
  tests, loading, onCreate, onStart, onDelete,
}: {
  tests: PracticeTest[]; loading: boolean;
  onCreate: () => void;
  onStart: (t: PracticeTest) => void;
  onDelete: (id: string) => void;
}) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Your Tests</div>
      <Button onClick={onCreate}>
        <Sparkles className="h-4 w-4 mr-1" /> New Practice Test
      </Button>
    </div>

    {loading ? (
      <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
    ) : tests.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-lg font-bold">No practice tests yet</h2>
        <p className="text-sm text-muted-foreground mt-1">Generate your first test to start drilling weak spots.</p>
        <Button onClick={onCreate} className="mt-4">
          <Plus className="h-4 w-4 mr-1" /> Create Test
        </Button>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tests.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-card p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.difficulty} • {t.total_questions} Q</div>
                <div className="font-bold truncate">{t.subject}</div>
                {t.topic && <div className="text-xs text-muted-foreground truncate">{t.topic}</div>}
              </div>
              <button onClick={() => onDelete(t.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">
              {new Date(t.created_at).toLocaleDateString()}
            </div>
            <Button size="sm" className="mt-3" onClick={() => onStart(t)}>
              Start <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ======================== History View ======================== */
const HistoryView = ({ attempts, loading }: { attempts: any[]; loading: boolean }) => {
  const bySubject = useMemo(() => {
    const map: Record<string, any[]> = {};
    attempts.forEach((a) => {
      if (!map[a.subject]) map[a.subject] = [];
      map[a.subject].push(a);
    });
    return map;
  }, [attempts]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (attempts.length === 0) return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <BarChart2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <h2 className="text-lg font-bold">No quiz history yet</h2>
      <p className="text-sm text-muted-foreground mt-1">Complete a quiz to see your progress here.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {Object.entries(bySubject).map(([subject, subAttempts]) => {
        const chartData = [...subAttempts].reverse().slice(-10).map((a, i) => ({
          n: i + 1,
          score: a.score_pct,
          date: new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        }));
        const avg = Math.round(subAttempts.reduce((s, a) => s + a.score_pct, 0) / subAttempts.length);
        return (
          <div key={subject} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold">{subject}</div>
                <div className="text-xs text-muted-foreground">{subAttempts.length} attempt{subAttempts.length !== 1 ? "s" : ""} · avg {avg}%</div>
              </div>
              <div className={cn("text-2xl font-black", getLetterGrade(avg).color)}>
                {getLetterGrade(avg).grade}
              </div>
            </div>
            {chartData.length > 1 && (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={9} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} fontSize={9} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ======================== Create View ======================== */
type InputType = "topic" | "paste" | "youtube" | "file";

const CreateView = ({
  subjects, onCancel, onCreated,
}: {
  subjects: string[];
  onCancel: () => void;
  onCreated: (t: PracticeTest) => void;
}) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState(subjects[0] ?? "Math");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [inputType, setInputType] = useState<InputType>("topic");
  const [pasteText, setPasteText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadedText, setUploadedText] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(["multiple_choice"]);
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(10);
  const fileRef = useRef<HTMLInputElement>(null);

  const allTypes: QuestionType[] = ["multiple_choice", "true_false", "short_answer", "fill_blank", "vocab_match"];

  const toggleType = (t: QuestionType) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]
    );
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadFileName(file.name);
    if (file.type === "text/plain") {
      const text = await file.text();
      setUploadedText(text.slice(0, 6000));
    } else {
      // For PDF/images, just use the filename as context
      setUploadedText(`[File: ${file.name}] — Please generate questions based on typical content for this subject.`);
    }
  };

  const fetchYoutubeTranscript = async (url: string): Promise<string> => {
    // Extract video ID
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!match) throw new Error("Invalid YouTube URL");
    const videoId = match[1];
    // Use YouTube Data API via Supabase function
    try {
      const { data } = await supabase.functions.invoke("youtube-search", {
        body: { videoId, mode: "transcript" },
      });
      return data?.transcript ?? `YouTube video ${videoId} — generate questions based on typical content for this subject and topic.`;
    } catch {
      return `YouTube video ${videoId} — generate questions based on typical content for this subject and topic.`;
    }
  };

  const generate = async () => {
    if (!user || !subject.trim()) return;
    setLoading(true);
    try {
      let sourceText = "";
      if (inputType === "paste") sourceText = pasteText;
      else if (inputType === "youtube") sourceText = await fetchYoutubeTranscript(youtubeUrl);
      else if (inputType === "file") sourceText = uploadedText;

      const questions = await generateTest({
        subject,
        topic: topic || undefined,
        difficulty,
        count,
        sourceText: sourceText || undefined,
        questionTypes: selectedTypes,
        additionalInstructions: additionalInstructions || undefined,
      });

      if (questions.length === 0) {
        toast.error("AI returned no questions, try again");
        return;
      }
      const saved = await saveTest({
        user_id: user.id, subject, topic: topic || null, difficulty, source: "ai", questions,
      });
      if (!saved) {
        toast.error("Could not save test");
        return;
      }
      // Attach time limit to the test object in memory
      if (timeLimitEnabled) {
        (saved as any).time_limit = timeLimitMinutes * 60;
      }
      toast.success("Test ready!");
      onCreated(saved);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate test");
    } finally {
      setLoading(false);
    }
  };

  const inputTabs: { id: InputType; label: string; icon: React.ReactNode }[] = [
    { id: "topic", label: "Topic", icon: <Type className="h-3.5 w-3.5" /> },
    { id: "paste", label: "Paste Text", icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "youtube", label: "YouTube", icon: <Youtube className="h-3.5 w-3.5" /> },
    { id: "file", label: "Upload File", icon: <Upload className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
        <h2 className="text-lg font-bold">New Practice Test</h2>
      </div>

      {/* Input Type Tabs */}
      <div>
        <Label className="text-xs mb-2 block">Generate From</Label>
        <div className="flex gap-1 flex-wrap">
          {inputTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setInputType(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                inputType === tab.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Source */}
      {inputType === "topic" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input list="subj-list" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Algebra" />
            <datalist id="subj-list">
              {subjects.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Topic (optional)</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Quadratic equations" />
          </div>
        </div>
      )}

      {inputType === "paste" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input list="subj-list2" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Biology" />
            <datalist id="subj-list2">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Paste your notes or text</Label>
            <Textarea
              rows={5}
              placeholder="Paste your notes, a paragraph, or any text here..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
          </div>
        </div>
      )}

      {inputType === "youtube" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input list="subj-list3" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="History" />
            <datalist id="subj-list3">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">YouTube Video URL</Label>
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        </div>
      )}

      {inputType === "file" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input list="subj-list4" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Science" />
            <datalist id="subj-list4">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Upload Notes (PDF, image, or text file)</Label>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.png,.jpg,.jpeg" className="hidden" onChange={(e) => handleFileUpload(e.target.files?.[0])} />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
            >
              {uploadFileName ? (
                <div className="text-sm font-medium text-primary">{uploadFileName} ✓</div>
              ) : (
                <>
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <div className="text-sm text-muted-foreground">Click to upload PDF, image, or text file</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Question Types */}
      <div>
        <Label className="text-xs mb-2 block">Question Types</Label>
        <div className="flex flex-wrap gap-2">
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                selectedTypes.includes(t)
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "border-border text-muted-foreground hover:border-primary/30"
              )}
            >
              <span>{QUESTION_TYPE_ICONS[t]}</span>
              {QUESTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Difficulty</Label>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Number of questions</Label>
          <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 20].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Time Limit */}
      <div className="flex items-center justify-between rounded-xl border border-border p-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Limit</span>
        </div>
        <div className="flex items-center gap-3">
          {timeLimitEnabled && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                max={120}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Math.max(1, Number(e.target.value)))}
                className="w-16 h-7 text-xs text-center"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          )}
          <Switch checked={timeLimitEnabled} onCheckedChange={setTimeLimitEnabled} />
        </div>
      </div>

      {/* Additional Instructions */}
      <div className="space-y-1">
        <Label className="text-xs">Additional Instructions (optional)</Label>
        <Input
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          placeholder='e.g. "focus on chapter 3" or "align to 8th grade standards"'
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button onClick={generate} disabled={loading || !subject.trim()}>
          {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-1" /> Generate</>}
        </Button>
      </div>
    </div>
  );
};

/* ======================== Taking View ======================== */
const TakingView = ({
  test, qIndex, answers, flaggedQuestions, setAnswer, toggleFlag,
  onPrev, onNext, onJump, onSubmit, onExit, startedAt, timeLimit, onTimeUp,
}: {
  test: PracticeTest;
  qIndex: number;
  answers: AnswerRecord[];
  flaggedQuestions: Set<number>;
  setAnswer: (i: number, v: Partial<AnswerRecord>) => void;
  toggleFlag: (i: number) => void;
  onPrev: () => void; onNext: () => void;
  onJump: (i: number) => void;
  onSubmit: () => void; onExit: () => void;
  startedAt: number;
  timeLimit: number | null;
  onTimeUp: () => void;
}) => {
  const q = test.questions[qIndex];
  const total = test.questions.length;
  const isLast = qIndex === total - 1;
  const allAnswered = answers.every((a) => a.selected_index !== null || (a.text_answer && a.text_answer.trim() !== "") || a.correct);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(timeLimit);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!timeLimit) return;
    setTimeLeft(timeLimit);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null) return null;
        if (t <= 1) {
          clearInterval(timerRef.current!);
          onTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLimit]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const isAmber = timeLeft !== null && timeLeft <= 60;
  const isCritical = timeLeft !== null && timeLeft <= 10;

  const getNavColor = (i: number) => {
    if (flaggedQuestions.has(i)) return "bg-destructive/80 text-white";
    const ans = answers[i];
    const hasAnswer = ans.selected_index !== null || (ans.text_answer && ans.text_answer.trim() !== "") || ans.correct;
    if (hasAnswer) return "bg-emerald-500/80 text-white";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onExit} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Exit
        </button>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-bold border",
              isCritical ? "border-destructive/60 bg-destructive/10 text-destructive animate-pulse" :
              isAmber ? "border-amber-500/60 bg-amber-500/10 text-amber-500" :
              "border-border bg-muted/40 text-foreground"
            )}>
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timeLeft)}
            </div>
          )}
          <div className="text-xs text-muted-foreground">Question {qIndex + 1} of {total}</div>
        </div>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-5">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((qIndex + 1) / total) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={qIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                {QUESTION_TYPE_ICONS[q.type as QuestionType]} {QUESTION_TYPE_LABELS[q.type as QuestionType]} · {q.topic}
              </div>
              <div className="text-lg font-semibold">{q.question}</div>
            </div>
            <button
              onClick={() => toggleFlag(qIndex)}
              className={cn(
                "p-1.5 rounded-lg transition-colors flex-shrink-0",
                flaggedQuestions.has(qIndex) ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive"
              )}
              title="Flag for review"
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>

          {/* Multiple Choice */}
          {(q.type === "multiple_choice" || !q.type) && (
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const selected = answers[qIndex]?.selected_index === i;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswer(qIndex, { selected_index: i })}
                    className={cn(
                      "w-full text-left rounded-xl border-2 p-3 text-sm transition-colors flex items-center gap-3",
                      selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <span className={cn(
                      "h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* True / False */}
          {q.type === "true_false" && (
            <div className="flex gap-3">
              {["True", "False"].map((opt, i) => {
                const selected = answers[qIndex]?.selected_index === i;
                return (
                  <button
                    key={opt}
                    onClick={() => setAnswer(qIndex, { selected_index: i })}
                    className={cn(
                      "flex-1 rounded-xl border-2 p-4 text-sm font-bold transition-colors",
                      selected
                        ? i === 0 ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-destructive bg-destructive/10 text-destructive"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {i === 0 ? "✅ True" : "❌ False"}
                  </button>
                );
              })}
            </div>
          )}

          {/* Short Answer */}
          {q.type === "short_answer" && (
            <div className="space-y-2">
              <Textarea
                rows={3}
                placeholder="Type your answer here..."
                value={answers[qIndex]?.text_answer ?? ""}
                onChange={(e) => setAnswer(qIndex, { text_answer: e.target.value })}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Your answer will be graded by AI with personalized feedback.</p>
            </div>
          )}

          {/* Fill in the Blank */}
          {q.type === "fill_blank" && (
            <div className="space-y-2">
              <Input
                placeholder="Type the missing word..."
                value={answers[qIndex]?.text_answer ?? ""}
                onChange={(e) => setAnswer(qIndex, { text_answer: e.target.value })}
              />
            </div>
          )}

          {/* Vocabulary Match */}
          {q.type === "vocab_match" && (
            <div className="space-y-2">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground mb-1">Term:</div>
                <div className="font-semibold">{q.question}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Your definition:</Label>
                <Textarea
                  rows={2}
                  placeholder="Write the definition for this term..."
                  value={answers[qIndex]?.text_answer ?? ""}
                  onChange={(e) => setAnswer(qIndex, { text_answer: e.target.value })}
                  className="resize-none"
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-5">
        <Button variant="ghost" onClick={onPrev} disabled={qIndex === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Prev
        </Button>
        {isLast ? (
          <Button onClick={() => allAnswered ? onSubmit() : setConfirmOpen(true)}>
            Submit <Check className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={onNext}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Question Navigator Strip */}
      <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
        {test.questions.map((_, i) => (
          <button
            key={i}
            onClick={() => onJump(i)}
            className={cn(
              "h-7 w-7 rounded-lg text-xs font-bold transition-colors",
              qIndex === i ? "ring-2 ring-primary ring-offset-1" : "",
              getNavColor(i)
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="flex gap-3 justify-center mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500/80 inline-block" />Answered</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-destructive/80 inline-block" />Flagged</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-muted inline-block" />Unanswered</span>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit unfinished test?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have {answers.filter((a) => a.selected_index === null && !a.text_answer?.trim()).length} unanswered question(s). Unanswered counts as wrong.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setConfirmOpen(false); onSubmit(); }}>Submit anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ======================== Results View ======================== */
const ResultsView = ({
  result, test, onRetry, onNew, onBack, onTutor,
}: {
  result: NonNullable<ReturnType<typeof useState<any>>[0]> & {
    correct: number; total: number; pct: number; weakTopics: string[];
    duration: number; recommendation: string | null; flagged: boolean; subject: string;
    answers: AnswerRecord[]; xpEarned: number; letterGrade: string;
  };
  test: PracticeTest;
  onRetry: () => void; onNew: () => void; onBack: () => void; onTutor: () => void;
}) => {
  const { grade, color } = getLetterGrade(result.pct);
  const passed = result.pct >= 70;

  return (
    <div className="space-y-5">
      {/* Animated Grade Reveal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className={cn(
          "rounded-2xl border-2 p-8 text-center",
          passed ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5",
        )}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className={cn("text-8xl font-black mb-2", color)}
        >
          {grade}
        </motion.div>
        <div className="text-4xl font-black tabular-nums">{result.pct}%</div>
        <div className="text-sm text-muted-foreground mt-2">
          {result.correct} / {result.total} correct · {Math.floor(result.duration / 60)}m {result.duration % 60}s
        </div>
        {/* XP Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-bold"
        >
          <Zap className="h-4 w-4" />
          +{result.xpEarned} XP earned
          {result.pct >= 90 && <span className="text-xs">(+50 bonus!)</span>}
        </motion.div>
      </motion.div>

      {/* Recommendation */}
      {result.recommendation && (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Next step</div>
            <div className="text-sm font-semibold mt-0.5">{result.recommendation}</div>
            {result.weakTopics.length > 0 && (
              <Button size="sm" className="mt-3" onClick={onTutor}>
                Study What I Missed <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Concept Weakness Report */}
      {result.weakTopics.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-amber-500" />
            <div className="text-xs font-bold uppercase tracking-widest text-amber-500">Concept Weakness Report</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.weakTopics.map((t: string) => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Flagged weakness */}
      {result.flagged && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-sm">
              You've scored below 70% on {result.subject} twice in a row
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Want the AI Tutor to run a focused review session?
            </div>
            <Button size="sm" className="mt-3" onClick={onTutor}>Yes, start review</Button>
          </div>
        </div>
      )}

      {/* Per-question breakdown */}
      <section>
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Question Review</div>
        <div className="space-y-2">
          {test.questions.map((q, i) => {
            const ans = result.answers[i];
            return (
              <div key={i} className={cn(
                "rounded-xl border p-3",
                ans.correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5",
              )}>
                <div className="flex items-start gap-2">
                  {ans.correct
                    ? <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    : <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                  <div className="text-sm font-semibold flex-1">{q.question}</div>
                </div>
                <div className="text-xs mt-2 ml-6 space-y-1">
                  {(q.type === "multiple_choice" || q.type === "true_false" || !q.type) && (
                    <>
                      <div className={cn(ans.correct ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                        Your answer: {ans.selected_index !== null ? q.options[ans.selected_index] : "— (skipped)"}
                      </div>
                      {!ans.correct && (
                        <div className="text-emerald-600 dark:text-emerald-400">
                          Correct: {q.options[q.correct_index]}
                        </div>
                      )}
                    </>
                  )}
                  {(q.type === "short_answer" || q.type === "fill_blank" || q.type === "vocab_match") && (
                    <>
                      <div className="text-muted-foreground">Your answer: {ans.text_answer || "— (skipped)"}</div>
                      {q.type === "fill_blank" && !ans.correct && (
                        <div className="text-emerald-600 dark:text-emerald-400">Correct: {q.blank_answer}</div>
                      )}
                      {q.type === "vocab_match" && (
                        <div className="text-emerald-600 dark:text-emerald-400">Definition: {q.definition}</div>
                      )}
                      {ans.ai_feedback && (
                        <div className="text-primary italic">{ans.ai_feedback}</div>
                      )}
                    </>
                  )}
                  <div className="text-muted-foreground italic">{q.explanation}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={onRetry}><RefreshCw className="h-4 w-4 mr-1" /> Retake</Button>
        <Button variant="outline" onClick={onNew}><Sparkles className="h-4 w-4 mr-1" /> New Test</Button>
        <Button variant="ghost" onClick={onBack}>Back to list</Button>
      </div>
    </div>
  );
};

export default PracticeTests;
