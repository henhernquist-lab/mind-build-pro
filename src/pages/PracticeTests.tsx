import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Brain, Loader2, Plus, Sparkles, Trash2, ArrowRight, ArrowLeft, Check, X,
  Trophy, AlertTriangle, Lightbulb, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSubjects } from "@/lib/subjects";
import {
  generateTest, saveTest, listTests, deleteTest,
  recordAttempt, getRecommendation, updateSubjectWeakness,
  getFlaggedSubjects, dismissFlag, setTutorPrefill,
  type PracticeQuestion, type PracticeTest, type AnswerRecord, type SubjectWeakness,
} from "@/lib/practice/api";

type Stage = "list" | "create" | "taking" | "results";

const PracticeTests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const subjects = useSubjects();

  const [stage, setStage] = useState<Stage>("list");
  const [tests, setTests] = useState<PracticeTest[]>([]);
  const [flagged, setFlagged] = useState<SubjectWeakness[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const [t, f] = await Promise.all([listTests(user.id), getFlaggedSubjects(user.id)]);
    setTests(t); setFlagged(f);
    setLoading(false);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  // Active test state
  const [activeTest, setActiveTest] = useState<PracticeTest | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [lastResult, setLastResult] = useState<{
    correct: number; total: number; pct: number; weakTopics: string[];
    duration: number; recommendation: string | null; flagged: boolean; subject: string;
    answers: AnswerRecord[];
  } | null>(null);

  const startTest = (test: PracticeTest) => {
    setActiveTest(test);
    setAnswers(Array(test.questions.length).fill(null));
    setQIndex(0);
    setStartedAt(Date.now());
    setStage("taking");
  };

  const submitTest = async () => {
    if (!activeTest || !user) return;
    const duration = Math.round((Date.now() - startedAt) / 1000);
    const records: AnswerRecord[] = activeTest.questions.map((q, i) => ({
      question_index: i,
      topic: q.topic,
      selected_index: answers[i],
      correct: answers[i] === q.correct_index,
    }));
    const correct = records.filter((r) => r.correct).length;
    const total = records.length;
    const pct = Math.round((correct / total) * 100);
    const weakTopicsSet = new Set<string>();
    records.forEach((r) => { if (!r.correct) weakTopicsSet.add(r.topic); });
    const weakTopics = Array.from(weakTopicsSet);

    await recordAttempt({
      user_id: user.id,
      test_id: activeTest.id,
      subject: activeTest.subject,
      score_pct: pct,
      correct_count: correct,
      total_count: total,
      duration_seconds: duration,
      answers: records,
      weak_topics: weakTopics,
    });

    const flaggedNow = await updateSubjectWeakness(user.id, activeTest.subject, pct);
    const recommendation = await getRecommendation(activeTest.subject, pct, weakTopics);

    setLastResult({
      correct, total, pct, weakTopics, duration, recommendation,
      flagged: flaggedNow, subject: activeTest.subject, answers: records,
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
          AI generates a custom test on any subject. Get instant scoring and a focused next-step recommendation.
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
        <ListView
          tests={tests}
          loading={loading}
          onCreate={() => setStage("create")}
          onStart={startTest}
          onDelete={async (id) => { await deleteTest(id); refresh(); }}
        />
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
          setAnswer={(i, v) => setAnswers((a) => a.map((x, idx) => idx === i ? v : x))}
          onPrev={() => setQIndex((i) => Math.max(0, i - 1))}
          onNext={() => setQIndex((i) => Math.min(activeTest.questions.length - 1, i + 1))}
          onSubmit={submitTest}
          onExit={() => { setStage("list"); setActiveTest(null); }}
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

/* ======================== Sub-views ======================== */

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

  const generate = async () => {
    if (!user || !subject.trim()) return;
    setLoading(true);
    try {
      const questions = await generateTest({ subject, topic, difficulty, count });
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
      toast.success("Test ready!");
      onCreated(saved);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-xl">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
        <h2 className="text-lg font-bold">New Practice Test</h2>
      </div>
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

const TakingView = ({
  test, qIndex, answers, setAnswer, onPrev, onNext, onSubmit, onExit,
}: {
  test: PracticeTest;
  qIndex: number;
  answers: (number | null)[];
  setAnswer: (i: number, v: number) => void;
  onPrev: () => void; onNext: () => void;
  onSubmit: () => void; onExit: () => void;
}) => {
  const q = test.questions[qIndex];
  const total = test.questions.length;
  const isLast = qIndex === total - 1;
  const allAnswered = answers.every((a) => a !== null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onExit} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Exit
        </button>
        <div className="text-xs text-muted-foreground">Question {qIndex + 1} of {total}</div>
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
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{q.topic}</div>
          <div className="text-lg font-semibold mb-5">{q.question}</div>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const selected = answers[qIndex] === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswer(qIndex, i)}
                  className={cn(
                    "w-full text-left rounded-xl border-2 p-3 text-sm transition-colors flex items-center gap-3",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40",
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
        </motion.div>
      </AnimatePresence>

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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit unfinished test?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have {answers.filter((a) => a === null).length} unanswered question(s). Unanswered counts as wrong.
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

const ResultsView = ({
  result, test, onRetry, onNew, onBack, onTutor,
}: {
  result: NonNullable<ReturnType<typeof useState<any>>[0]> & {
    correct: number; total: number; pct: number; weakTopics: string[];
    duration: number; recommendation: string | null; flagged: boolean; subject: string;
    answers: AnswerRecord[];
  };
  test: PracticeTest;
  onRetry: () => void; onNew: () => void; onBack: () => void; onTutor: () => void;
}) => {
  const passed = result.pct >= 70;
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "rounded-2xl border-2 p-6 text-center",
          passed ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5",
        )}
      >
        <Trophy className={cn("h-10 w-10 mx-auto mb-2", passed ? "text-emerald-500" : "text-amber-500")} />
        <div className="text-5xl font-black tabular-nums">{result.pct}%</div>
        <div className="text-sm text-muted-foreground mt-1">
          {result.correct} / {result.total} correct • {Math.round(result.duration / 60)}m {result.duration % 60}s
        </div>
      </motion.div>

      {result.recommendation && (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Next step</div>
            <div className="text-sm font-semibold mt-0.5">{result.recommendation}</div>
            <Button size="sm" className="mt-3" onClick={onTutor}>Open in AI Tutor <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      )}

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
                  <div className="text-sm font-semibold">{q.question}</div>
                </div>
                <div className="text-xs mt-2 ml-6 space-y-1">
                  <div className={cn(ans.correct ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                    Your answer: {ans.selected_index !== null ? q.options[ans.selected_index] : "— (skipped)"}
                  </div>
                  {!ans.correct && (
                    <div className="text-emerald-600 dark:text-emerald-400">
                      Correct: {q.options[q.correct_index]}
                    </div>
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