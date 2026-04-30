import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sounds";

export type Q = { question: string; type: "multiple_choice" | "short_answer"; choices: string[] | null; answer: string; explanation: string };

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");

export const QuestionPrompt = ({ q, onResolve, disabled }: { q: Q; onResolve: (correct: boolean) => void; disabled?: boolean }) => {
  const [pick, setPick] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [right, setRight] = useState(false);

  const submit = () => {
    if (revealed) return;
    const ans = q.type === "multiple_choice" ? pick ?? "" : text;
    if (!ans) return;
    const correct = norm(ans) === norm(q.answer) || norm(q.answer).includes(norm(ans));
    setRight(correct);
    setRevealed(true);
    if (correct) {
      sfx.correct();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { (navigator as Navigator).vibrate?.(30); } catch {}
      }
    } else {
      sfx.wrong();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { (navigator as Navigator).vibrate?.([60, 40, 60]); } catch {}
      }
    }
    setTimeout(() => onResolve(correct), 1400);
  };

  return (
    <motion.div
      className="space-y-3"
      animate={revealed && !right ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
    >
      <p className="text-sm font-medium leading-relaxed">{q.question}</p>
      {q.type === "multiple_choice" && q.choices ? (
        <div className="grid gap-2">
          {q.choices.map((c) => (
            <button
              key={c}
              disabled={revealed || disabled}
              onClick={() => setPick(c)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                revealed && norm(c) === norm(q.answer) && "border-green-500 bg-green-500/10",
                revealed && pick === c && norm(c) !== norm(q.answer) && "border-destructive bg-destructive/10",
                !revealed && pick === c && "border-primary bg-primary/10",
                !revealed && pick !== c && "border-border hover:bg-accent",
              )}
            >{c}</button>
          ))}
        </div>
      ) : (
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer" disabled={revealed || disabled} onKeyDown={(e) => e.key === "Enter" && submit()} />
      )}
      {!revealed && <Button onClick={submit} disabled={disabled || (q.type === "multiple_choice" ? !pick : !text)}>Submit</Button>}
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className={cn(
            "rounded-lg p-3 text-sm border",
            right
              ? "border-green-500/40 bg-green-500/10 shadow-[0_0_24px_-4px_hsl(142_71%_45%/0.4)]"
              : "border-destructive/40 bg-destructive/10",
          )}
        >
          <div className="font-semibold mb-1">{right ? "✅ Correct!" : `❌ Answer: ${q.answer}`}</div>
          <div className="text-xs text-muted-foreground">{q.explanation}</div>
        </motion.div>
      )}
    </motion.div>
  );
};
