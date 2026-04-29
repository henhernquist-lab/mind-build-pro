import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
    setTimeout(() => onResolve(correct), 1400);
  };

  return (
    <div className="space-y-3">
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
        <div className={cn("rounded-lg p-3 text-sm border", right ? "border-green-500/40 bg-green-500/10" : "border-destructive/40 bg-destructive/10")}>
          <div className="font-semibold mb-1">{right ? "✅ Correct!" : `❌ Answer: ${q.answer}`}</div>
          <div className="text-xs text-muted-foreground">{q.explanation}</div>
        </div>
      )}
    </div>
  );
};
