// Global "floating +XP" toast layer. Subscribe via window event.
import { useEffect, useState } from "react";
import { sfx } from "@/lib/sounds";

type Item = { id: number; amount: number; x: number; y: number; color: string };

let counter = 0;

export const showFloatingXp = (amount: number, opts?: { x?: number; y?: number; color?: string }) => {
  const detail = {
    amount,
    x: opts?.x ?? window.innerWidth - 80,
    y: opts?.y ?? 80,
    color: opts?.color ?? "hsl(var(--primary))",
  };
  window.dispatchEvent(new CustomEvent("floating-xp", { detail }));
  if (amount > 0) sfx.xp();
};

export const FloatingXpLayer = () => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
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
          className="absolute xp-float font-extrabold"
          style={{
            left: it.x,
            top: it.y,
            color: it.color,
            fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif",
            fontSize: '1.4rem',
            letterSpacing: '0.05em',
            textShadow: `0 0 10px ${it.color}, 0 0 20px ${it.color}88`,
          }}
        >
          {it.amount > 0 ? "+" : ""}{it.amount} XP
        </div>
      ))}
    </div>
  );
};