import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Send, X, Bot, Loader2, ArrowRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAceSuggestion, markSuggestionSeen, hasSeenSuggestion } from "@/lib/ace/suggestions";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_CHIPS: Record<string, string[]> = {
  "/": ["What's today look like?", "Add a block", "Clear my evening"],
  "/workouts": ["Log a workout", "What's my rank?", "How many XP to next rank?"],
  "/tutor": ["Quick question", "Practice problem", "Explain simpler"],
  "/nutrition": ["What should I eat?", "How are my macros?", "Game day meal plan"],
  "/profile": ["Update my stats", "View my season", "Share my card"],
  "/leaderboard": ["Where do I rank?", "How do I climb faster?", "Season ends when?"],
  "/championship": ["What's the championship?", "Am I qualified?", "Claim my reward"],
  "/practice": ["Generate a test", "Pick a weak topic", "Quick 5-question quiz"],
  "/tests": ["Next test?", "Schedule a review", "Tips for studying"],
};
const DEFAULT_CHIPS = ["What should I do next?", "How am I doing?", "Hype me up"];

const stripNavigate = (text: string): { text: string; href: string | null } => {
  const m = text.match(/\[NAVIGATE:([^\]]+)\]/);
  if (!m) return { text, href: null };
  return { text: text.replace(m[0], "").trim(), href: m[1].trim() };
};

export const AceAssistant = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestion = useAceSuggestion();
  const hasUnreadSuggestion = !!suggestion && !hasSeenSuggestion(suggestion.text);
  const firstName = (profile?.display_name || user?.email?.split("@")[0] || "there").split(" ")[0];

  // Load history from Supabase the first time the drawer opens
  useEffect(() => {
    if (!open || historyLoaded || !user) return;
    (async () => {
      const { data } = await supabase
        .from("ace_messages")
        .select("role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      const recent = ((data as any[]) || []).reverse().map((m) => ({ role: m.role, content: m.content })) as Msg[];
      if (recent.length === 0) {
        recent.push({
          role: "assistant",
          content: `Hey ${firstName}! 👋 I'm Ace — your personal coach + tutor in here. Ask me anything or tap a quick action below.`,
        });
      }
      setMessages(recent);
      setHistoryLoaded(true);
    })();
  }, [open, historyLoaded, user, firstName]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    const leadWith = hasUnreadSuggestion ? suggestion?.text : null;
    if (suggestion && hasUnreadSuggestion) markSuggestionSeen(suggestion.text);

    try {
      const { data, error } = await supabase.functions.invoke("ace-chat", {
        body: {
          messages: next.slice(-10),
          currentPath: location.pathname,
          leadWithSuggestion: leadWith,
        },
      });
      if (error || (data as any)?.error) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: (data as any)?.error || "Hmm, I hit a snag. Try again?" },
        ]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: (data as any).reply ?? "" }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Connection blip. Try again?" }]);
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = () => {
    setOpen(true);
    if (suggestion && hasUnreadSuggestion) markSuggestionSeen(suggestion.text);
  };

  if (!user) return null;

  const chips = QUICK_CHIPS[location.pathname] || DEFAULT_CHIPS;

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={openDrawer}
            className={cn(
              "fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] md:bottom-6 right-20 md:right-4 z-50 h-12 w-12 md:h-14 md:w-14 rounded-full text-[hsl(var(--background))] shadow-2xl flex items-center justify-center transition-transform press slow-spin",
              "bg-gradient-to-br from-[hsl(var(--cyan))] to-[hsl(var(--neon))]",
              hasUnreadSuggestion && "ripple-ring"
            )}
            style={{ boxShadow: "0 10px 30px -5px hsl(var(--cyan) / 0.55), 0 0 24px hsl(var(--neon) / 0.35)" }}
            aria-label="Open Ace assistant"
            data-testid="ace-fab"
          >
            <Sparkles className="h-5 w-5 md:h-6 md:w-6 relative z-10 drop-shadow-[0_0_6px_hsl(var(--background)/0.6)]" />
            {hasUnreadSuggestion && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[hsl(var(--pr-red))] ring-2 ring-background z-20 flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className={cn(
                "fixed z-50 bg-card border border-border shadow-2xl flex flex-col",
                // Mobile: bottom sheet
                "bottom-0 left-0 right-0 rounded-t-3xl max-h-[70vh]",
                // Desktop: side panel
                "md:bottom-6 md:right-6 md:left-auto md:top-auto md:rounded-2xl md:w-[400px] md:max-h-[600px]",
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-school flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-bold text-sm leading-tight">Ace</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">your personal coach + tutor</div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Suggestion banner */}
              {suggestion && (
                <div className="px-4 py-2 bg-primary/5 border-b border-border text-xs text-primary flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span className="flex-1">{suggestion.text}</span>
                </div>
              )}

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                {!historyLoaded ? (
                  <div className="flex justify-center py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
                ) : (
                  messages.slice(-5).map((m, i) => (
                    <MessageBubble key={i} msg={m} onNavigate={(href) => { setOpen(false); navigate(href); }} />
                  ))
                )}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bubble-pop-left">
                    <Bot className="h-3.5 w-3.5" />
                    <span className="inline-flex gap-1.5 items-center">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </span>
                  </div>
                )}
              </div>

              {/* Quick chips */}
              <div className="px-4 pt-2 flex gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
                {chips.map((c) => (
                  <button
                    key={c}
                    onClick={() => send(c)}
                    disabled={loading}
                    className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full border border-border bg-card hover:border-primary hover:text-primary text-muted-foreground transition-colors disabled:opacity-50"
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="p-3 flex gap-2 border-t border-border mt-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Ace anything..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const MessageBubble = ({ msg, onNavigate }: { msg: Msg; onNavigate: (href: string) => void }) => {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end bubble-pop-right">
        <div
          className="max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm"
          style={{
            background: "hsl(var(--cyan) / 0.18)",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--cyan) / 0.30)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            boxShadow: "0 6px 24px -8px hsl(var(--cyan) / 0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }
  const { text, href } = stripNavigate(msg.content);
  return (
    <div className="flex gap-2 bubble-pop-left">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[hsl(var(--cyan))] to-[hsl(var(--neon))] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_14px_hsl(var(--cyan)/0.45)]">
        <Bot className="h-3.5 w-3.5" style={{ color: "hsl(var(--background))" }} />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div
          className="rounded-2xl rounded-tl-sm px-3.5 py-2 text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-p:leading-snug"
          style={{
            background: "rgba(13, 21, 32, 0.7)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderLeft: "2px solid hsl(var(--cyan) / 0.55)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderLeftWidth: "2px",
            borderLeftColor: "hsl(var(--cyan))",
            boxShadow: "0 6px 24px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
        {href && (
          <button
            onClick={() => onNavigate(href)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--cyan))] hover:underline px-3"
          >
            Take me there <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};