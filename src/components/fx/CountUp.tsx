import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
  /** Re-trigger animation each time `value` changes (default: false — only first time in viewport) */
  retrigger?: boolean;
  /** Component tag — default span */
  as?: "span" | "div";
}

/**
 * Animates from 0 → value (or previous → value when retrigger) once the
 * element enters the viewport. Cubic ease-out, 1200ms by default.
 */
export const CountUp = ({
  value,
  duration = 1200,
  className,
  format,
  retrigger = false,
  as = "span",
}: Props) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [displayed, setDisplayed] = useState(0);
  const startedRef = useRef(false);
  const previousRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const node = ref.current;
    if (!node) return;

    const start = () => {
      const from = retrigger ? previousRef.current : 0;
      const to = value;
      if (from === to) {
        setDisplayed(to);
        return;
      }
      const t0 = performance.now();
      let raf = 0;
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const cur = Math.round(from + (to - from) * eased);
        setDisplayed(cur);
        if (t < 1) raf = requestAnimationFrame(step);
        else previousRef.current = to;
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    };

    if (startedRef.current && retrigger) {
      const cleanup = start();
      return cleanup;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            startedRef.current = true;
            start();
            io.unobserve(node);
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const text = format ? format(displayed) : displayed.toLocaleString();
  const Tag = as as any;
  return <Tag ref={ref} className={className}>{text}</Tag>;
};
