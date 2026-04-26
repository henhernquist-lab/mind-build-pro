import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Lightbulb, RefreshCcw, Send, Sparkles, Loader2, Settings, Plus, Trash2, ArrowUp, ArrowDown,
  Globe, Eye, EyeOff, Info, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Msg = { role: "user" | "assistant"; content: string };
type Subject = { id: string; label: string; emoji: string; color: string; description?: string };

type ParsedMessage = {
  text: string;
  visual: string | null; // raw <svg>...</svg>
  sources: { n: number; url: string }[];
};

const parseMessage = (raw: string): ParsedMessage => {
  let text = raw;
  let visual: string | null = null;
  const sources: { n: number; url: string }[] = [];

  // Visual block
  const visualMatch = text.match(/\[VISUAL\]\s*([\s\S]*?)\s*\[\/VISUAL\]/);
  if (visualMatch) {
    const inner = visualMatch[1].trim();
    const svgMatch = inner.match(/<svg[\s\S]*?<\/svg>/i);
    visual = svgMatch ? svgMatch[0] : null;
    text = text.replace(visualMatch[0], "").trim();
  }

  // Sources block
  const srcMatch = text.match(/\[SOURCES\]\s*([\s\S]*?)\s*\[\/SOURCES\]/);
  if (srcMatch) {
    const lines = srcMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^\[?(\d+)\]?\.?\s*(https?:\/\/\S+)/);
      if (m) sources.push({ n: parseInt(m[1]), url: m[2] });
    }
    text = text.replace(srcMatch[0], "").trim();
  }

  return { text, visual, sources };
};

// Triggers Deep Search auto-on
const AUTO_SEARCH_KEYWORDS = /\b(current|today|latest|recent|now|this year|2024|2025|2026)\b/i;
const isGeorgiaCurrentEvent = (subjectId: string, q: string) =>
  subjectId === "georgia" && AUTO_SEARCH_KEYWORDS.test(q);
const shouldAutoSearch = (subjectId: string, q: string) =>
  AUTO_SEARCH_KEYWORDS.test(q) || isGeorgiaCurrentEvent(subjectId, q);

const DEFAULT_SUBJECTS: Subject[] = [
  { id: "algebra", label: "Algebra 1", emoji: "🧮", color: "school", description: "Equations, graphing, word problems" },
  { id: "langlit", label: "Lang & Lit", emoji: "📖", color: "school", description: "Essays, grammar, reading analysis" },
  { id: "georgia", label: "Georgia Studies", emoji: "🍑", color: "sports", description: "GA history, geography, government" },
  { id: "science", label: "Phys Science", emoji: "⚗️", color: "coding", description: "Forces, energy, matter, chemistry" },
  { id: "spanish", label: "Spanish", emoji: "🌎", color: "sports", description: "Vocabulary, conjugation, sentences" },
];

const COLORS = ["school", "sports", "coding"] as const;
const EMOJI_CHOICES = ["📚", "🧮", "📖", "🍑", "⚗️", "🌎", "🎨", "🎵", "🏛️", "💻", "🧠", "🔬", "📐", "🌍", "✏️"];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

const accentVar = (c: string) => `hsl(var(--${c}))`;

const SubjectChat = ({ subject }: { subject: Subject }) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [deepSearch, setDeepSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hiddenVisuals, setHiddenVisuals] = useState<Record<number, boolean>>({});
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const stream = async (history: Msg[], mode?: "practice" | "simpler", forceDeepSearch?: boolean) => {
    setLoading(true);
    const useDeep = forceDeepSearch ?? deepSearch;
    if (useDeep) setSearching(true);
    let assistant = "";
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}` } : {}),
        },
        body: JSON.stringify({
          subject: subject.id,
          customLabel: subject.label,
          messages: history,
          mode,
          deepSearch: useDeep,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast({ title: "Slow down!", description: "Too many questions too fast." });
        else if (resp.status === 402) toast({ title: "Out of AI credits", description: err.error ?? "Add funds." });
        else toast({ title: "Tutor unavailable", description: err.error ?? "Try again." });
        setMessages((m) => m.slice(0, -1));
        setLoading(false);
        return;
      }
      if (!resp.body) throw new Error("no stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        if (searching) setSearching(false);
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMessages((m) => {
                const next = [...m];
                next[next.length - 1] = { role: "assistant", content: assistant };
                return next;
              });
              requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Connection error", description: "Could not reach the tutor." });
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const send = () => {
    if (!input.trim() || loading) return;
    const auto = shouldAutoSearch(subject.id, input);
    const userMsg: Msg = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    stream(next, undefined, auto || deepSearch);
  };

  const practice = () => {
    if (loading) return;
    const userMsg: Msg = { role: "user", content: "Give me a practice problem." };
    const next = [...messages, userMsg];
    setMessages(next);
    stream(next, "practice");
  };

  const simpler = () => {
    if (loading || messages.length === 0) return;
    const userMsg: Msg = { role: "user", content: "Can you explain that simpler?" };
    const next = [...messages, userMsg];
    setMessages(next);
    stream(next, "simpler");
  };

  const toggleVisual = (i: number) => {
    setHiddenVisuals((h) => ({ ...h, [i]: !h[i] }));
  };

  return (
    <div className={cn(
      "flex flex-col h-[calc(100vh-15rem)] md:h-[calc(100vh-13rem)] rounded-2xl border border-border bg-card overflow-hidden transition-shadow",
      deepSearch && "deep-search-glow"
    )}>
      {/* Deep Search toggle bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-background/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{subject.emoji}</span>
          <div className="text-sm font-medium truncate">{subject.label}</div>
        </div>
        <TooltipProvider>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground" aria-label="What is Deep Search">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px]">
                Deep Search looks up real-time information to give more accurate and detailed answers.
              </TooltipContent>
            </Tooltip>
            <Globe className={cn("h-4 w-4", deepSearch ? "text-primary" : "text-muted-foreground")} />
            <span className="text-xs font-medium">Deep Search</span>
            <Switch checked={deepSearch} onCheckedChange={setDeepSearch} />
          </div>
        </TooltipProvider>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6 space-y-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4 text-3xl"
              style={{ background: `${accentVar(subject.color)}22`, border: `1px solid ${accentVar(subject.color)}44` }}
            >
              {subject.emoji}
            </div>
            <h3 className="text-lg font-semibold">Ask me anything about {subject.label}</h3>
            {subject.description && (
              <p className="text-xs text-muted-foreground mt-1">{subject.description}</p>
            )}
            <p className="text-sm text-muted-foreground max-w-md mt-3">
              I'll guide you step-by-step. Stuck? Hit "Explain it simpler". Want extra reps? Hit "Practice problem".
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const parsed = m.role === "assistant" ? parseMessage(m.content) : null;
            const visualHidden = hiddenVisuals[i];
            return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "assistant" && (
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${accentVar(subject.color)}22`, color: accentVar(subject.color) }}
                >
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 max-w-[85%] text-sm space-y-2",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                {m.role === "assistant" ? (
                  m.content === "" && loading ? (
                    <div className="flex items-center gap-2 py-1">
                      {searching ? (
                        <>
                          <Globe className="h-3.5 w-3.5 text-primary animate-pulse" />
                          <span className="text-xs text-muted-foreground">Searching the web…</span>
                        </>
                      ) : (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                    <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-pre:my-2 prose-ul:my-1.5 prose-ol:my-1.5">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {parsed?.text ?? m.content}
                      </ReactMarkdown>
                    </div>
                    {parsed?.visual && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleVisual(i)}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-1.5"
                        >
                          {visualHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {visualHidden ? "Show visual" : "Hide visual"}
                        </button>
                        {!visualHidden && (
                          <div
                            className="rounded-lg bg-background/60 border border-border p-3 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
                            // SVG content from a controlled prompt to a trusted gateway model.
                            // We strip the [VISUAL] wrapper and only allow <svg> tags via parseMessage.
                            dangerouslySetInnerHTML={{ __html: parsed.visual }}
                          />
                        )}
                      </div>
                    )}
                    {parsed && parsed.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {parsed.sources.map((s) => (
                          <a
                            key={s.n}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] bg-background/70 border border-border rounded-full px-2 py-0.5 hover:border-primary"
                          >
                            <span className="font-bold text-primary">[{s.n}]</span>
                            <span className="truncate max-w-[140px]">{new URL(s.url).hostname.replace(/^www\./, "")}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                    </>
                  )
                ) : (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                )}
              </div>
            </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="border-t border-border p-3 md:p-4 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={practice} disabled={loading}>
            <Lightbulb className="h-3.5 w-3.5 mr-1.5" />Practice problem
          </Button>
          <Button variant="outline" size="sm" onClick={simpler} disabled={loading || messages.length === 0}>
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />Explain it simpler
          </Button>
        </div>
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Ask your ${subject.label} question…`}
            rows={1}
            className="min-h-[44px] max-h-32 resize-none"
          />
          <Button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{ backgroundColor: accentVar(subject.color), color: "hsl(var(--background))" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

const ManageSubjects = ({
  subjects, setSubjects, open, setOpen,
}: {
  subjects: Subject[];
  setSubjects: (s: Subject[] | ((p: Subject[]) => Subject[])) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
}) => {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [color, setColor] = useState<string>("school");

  const add = () => {
    if (!label.trim()) return;
    const id = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
    setSubjects((arr) => [...arr, { id, label: label.trim(), description: description.trim() || undefined, emoji, color }]);
    setLabel("");
    setDescription("");
    setEmoji("📚");
    setColor("school");
  };

  const remove = (id: string) => setSubjects((arr) => arr.filter((s) => s.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    setSubjects((arr) => {
      const i = arr.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return arr;
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const resetDefaults = () => setSubjects(DEFAULT_SUBJECTS);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Subjects</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs">Your subjects</Label>
          <div className="space-y-1.5">
            {subjects.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                <span className="text-xl">{s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.label}</div>
                  {s.description && <div className="text-[11px] text-muted-foreground truncate">{s.description}</div>}
                </div>
                <button
                  onClick={() => move(s.id, -1)}
                  disabled={i === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(s.id, 1)}
                  disabled={i === subjects.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(s.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {subjects.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">No subjects. Add one below.</div>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <Label className="text-xs">Add new subject</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Subject name (e.g. World History)"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional focus area / description"
          />
          <div>
            <Label className="text-[11px] text-muted-foreground mb-1.5 block">Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "h-8 w-8 rounded-md text-lg flex items-center justify-center border",
                    emoji === e ? "border-primary bg-accent" : "border-border"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground mb-1.5 block">Accent color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 px-3 rounded-md text-xs font-medium capitalize border-2 transition-all",
                    color === c ? "ring-2 ring-offset-2 ring-offset-background" : ""
                  )}
                  style={{
                    borderColor: accentVar(c),
                    backgroundColor: color === c ? accentVar(c) : "transparent",
                    color: color === c ? "hsl(var(--background))" : accentVar(c),
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={add} disabled={!label.trim()} className="w-full">
            <Plus className="h-4 w-4 mr-1.5" /> Add subject
          </Button>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={resetDefaults}>
            Reset to defaults
          </Button>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Tutor = () => {
  const [subjects, setSubjects] = useLocalStorage<Subject[]>("tutor:subjects", DEFAULT_SUBJECTS);
  const [active, setActive] = useState<string>(subjects[0]?.id ?? "");
  const [manageOpen, setManageOpen] = useState(false);

  // Keep active tab valid
  useEffect(() => {
    if (subjects.length === 0) {
      setActive("");
    } else if (!subjects.find((s) => s.id === active)) {
      setActive(subjects[0].id);
    }
  }, [subjects, active]);

  const activeSubject = useMemo(() => subjects.find((s) => s.id === active), [subjects, active]);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Powered by AI</p>
          <h1 className="text-3xl font-bold mt-1">AI Tutor</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
          <Settings className="h-4 w-4 mr-1.5" /> Manage subjects
        </Button>
      </header>

      {subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">No subjects yet. Add some to get started.</p>
          <Button onClick={() => setManageOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add a subject
          </Button>
        </div>
      ) : (
        <Tabs value={active} onValueChange={setActive}>
          <TabsList className="flex flex-wrap h-auto justify-start mb-4">
            {subjects.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="data-[state=active]:bg-accent">
                <span className="mr-1.5">{s.emoji}</span>{s.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {activeSubject && (
            <TabsContent value={activeSubject.id} className="mt-0">
              <SubjectChat key={activeSubject.id} subject={activeSubject} />
            </TabsContent>
          )}
        </Tabs>
      )}

      <ManageSubjects
        subjects={subjects}
        setSubjects={setSubjects}
        open={manageOpen}
        setOpen={setManageOpen}
      />
    </div>
  );
};

export default Tutor;
