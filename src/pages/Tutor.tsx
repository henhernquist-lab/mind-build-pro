import { useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, RefreshCcw, Send, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUBJECTS = [
  { id: "algebra", label: "Algebra 1", emoji: "🧮", color: "school" },
  { id: "langlit", label: "Lang & Lit", emoji: "📖", color: "school" },
  { id: "georgia", label: "Georgia Studies", emoji: "🍑", color: "sports" },
  { id: "science", label: "Phys Science", emoji: "⚗️", color: "coding" },
  { id: "spanish", label: "Spanish", emoji: "🌎", color: "sports" },
] as const;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

const accentVar = (c: string) => `hsl(var(--${c}))`;

const SubjectChat = ({ subject, label, color, emoji }: { subject: string; label: string; color: string; emoji: string }) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const stream = async (history: Msg[], mode?: "practice" | "simpler") => {
    setLoading(true);
    let assistant = "";
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}` } : {}),
        },
        body: JSON.stringify({ subject, messages: history, mode }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast({ title: "Slow down!", description: "Too many questions too fast. Wait a moment." });
        } else if (resp.status === 402) {
          toast({ title: "Out of AI credits", description: err.error ?? "Add funds in Lovable workspace." });
        } else {
          toast({ title: "Tutor unavailable", description: err.error ?? "Try again." });
        }
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
    }
  };

  const send = () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    stream(next);
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

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)] md:h-[calc(100vh-12rem)] rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6 space-y-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4 text-3xl"
              style={{ background: `${accentVar(color)}22`, border: `1px solid ${accentVar(color)}44` }}
            >
              {emoji}
            </div>
            <h3 className="text-lg font-semibold">Ask me anything about {label}</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-2">
              I'll guide you step-by-step. Stuck? Hit "Explain it simpler". Want extra reps? Hit "Practice problem".
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "assistant" && (
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${accentVar(color)}22`, color: accentVar(color) }}
                >
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 max-w-[85%] text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                {m.role === "assistant" ? (
                  m.content === "" && loading ? (
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-pre:my-2 prose-ul:my-1.5 prose-ol:my-1.5">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )
                ) : (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                )}
              </div>
            </motion.div>
          ))}
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
            placeholder={`Ask your ${label} question…`}
            rows={1}
            className="min-h-[44px] max-h-32 resize-none"
          />
          <Button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{ backgroundColor: accentVar(color), color: "hsl(var(--background))" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Tutor = () => {
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Powered by AI</p>
        <h1 className="text-3xl font-bold mt-1">AI Tutor</h1>
      </header>

      <Tabs defaultValue="algebra">
        <TabsList className="flex flex-wrap h-auto justify-start mb-4">
          {SUBJECTS.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="data-[state=active]:bg-accent">
              <span className="mr-1.5">{s.emoji}</span>{s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SUBJECTS.map((s) => (
          <TabsContent key={s.id} value={s.id} className="mt-0">
            <SubjectChat subject={s.id} label={s.label} color={s.color} emoji={s.emoji} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Tutor;