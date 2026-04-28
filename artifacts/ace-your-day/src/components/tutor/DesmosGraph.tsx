import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

declare global {
  interface Window {
    Desmos?: any;
    __desmosLoading?: Promise<void>;
  }
}

const DESMOS_SRC =
  "https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";

const loadDesmos = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Desmos) return Promise.resolve();
  if (window.__desmosLoading) return window.__desmosLoading;
  window.__desmosLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = DESMOS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Desmos"));
    document.head.appendChild(s);
  });
  return window.__desmosLoading;
};

// Convert "y=2x+3" or "x^2+y^2=25" into a Desmos-friendly latex string.
const toLatex = (expr: string): string => {
  let s = expr.trim();
  // Convert ^ to LaTeX ^{...} for single-digit exponents at minimum.
  s = s.replace(/\^(\([^)]+\)|\d+(?:\.\d+)?|[a-zA-Z])/g, "^{$1}");
  // Convert sqrt(x) -> \sqrt{x}
  s = s.replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");
  // Convert pi
  s = s.replace(/\bpi\b/g, "\\pi");
  return s;
};

export const DesmosGraph = ({ expressions }: { expressions: string[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const calcRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDesmos()
      .then(() => {
        if (cancelled || !ref.current || !window.Desmos) return;
        if (!calcRef.current) {
          calcRef.current = window.Desmos.GraphingCalculator(ref.current, {
            expressions: false,
            settingsMenu: false,
            zoomButtons: true,
            keypad: false,
            border: false,
            lockViewport: false,
          });
        }
        const calc = calcRef.current;
        calc.setBlank();
        expressions.forEach((e, i) => {
          calc.setExpression({ id: `g${i}`, latex: toLatex(e) });
        });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("Couldn't load the graph.");
      });
    return () => {
      cancelled = true;
    };
  }, [expressions.join("|")]);

  useEffect(() => {
    return () => {
      try { calcRef.current?.destroy(); } catch {}
      calcRef.current = null;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
        {error}
      </div>
    );
  }

  const desmosUrl = `https://www.desmos.com/calculator?expressions=${encodeURIComponent(
    JSON.stringify(expressions.map((e, i) => ({ id: `g${i}`, latex: toLatex(e) })))
  )}`;

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border">
        <span className="text-[11px] font-medium text-muted-foreground">
          Graph: {expressions.join(", ")}
        </span>
        <a
          href={desmosUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Open in Desmos <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
      <div ref={ref} className="w-full h-72" />
    </div>
  );
};