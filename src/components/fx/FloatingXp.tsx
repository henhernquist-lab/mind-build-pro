// Global "floating +XP" toast layer. Subscribe via window event.
import { useEffect, useState } from "react";
import { sfx } from "@/lib/sounds";

export type XpType = "normal" | "pr" | "academic";

type Item = {
  id: number;
  amount: number;
  x: number;
  y: number;
  color: string;
  type: XpType;
};

let counter = 0;

const colorForType = (type: XpType, override?: string) => {
  if (override) return override;
  switch (type) {
    case "pr":       return "hsl(var(--gold))";       // PR bonus = gold
    case "academic": return "hsl(199 100% 60%)";     // Academic = blue
    default:         return "hsl(var(--neon))";       // Normal XP = green
  }
};

export const showFloatingXp = (
  amount: number,
  opts?: { x?: number; y?: number; color?: string; type?: XpType },
) => {
  const type: XpType = opts?.type ?? "normal";
  const detail = {
    amount,
    x: opts?.x ?? window.innerWidth - 80,
    y: opts?.y ?? 80,
    color: colorForType(type, opts?.color),
    type,
  };
  window.dispatchEvent(new CustomEvent("floating-xp", { detail }));
  if (amount > 0) sfx.xp();
};

export const FloatingXpLayer = () => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as Omit<Item, "id">;
      const id = ++counter;
      setItems((cur) => [...cur, { id, ...d }]);
      setTimeout(() => setItems((cur) => cur.filter((i) => i.id !== id)), 1500);
    };
    window.addEventListener("floating-xp", handler);
    return () => window.removeEventListener("floating-xp", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" aria-hidden>
      {items.map((it) => (
        <div
          key={it.id}
          className="absolute xp-float tracking-normalr"
          style={{
            left: it.x,
            top: it.y,
            color: it.color,
            fontSize: it.type === "pr" ? "26px" : "20px",
            textShadow: `0 0 12px ${it.color}, 0 0 24px ${it.color}88`,
          }}
        >
          {it.amount > 0 ? "+" : ""}{it.amount} XP
        </div>
      ))}
    </div>
  );
};
