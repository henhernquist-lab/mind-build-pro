import { useEffect, useRef, useState } from "react";

/**
 * Premium custom cursor (desktop only).
 * - Outer ring with spring lag, inner dot 1:1 to mouse.
 * - Grows and fills lightly on hoverable elements.
 * - Morphs to a vertical bar on text-input fields.
 * - Pulse on press.
 * - Disabled on touch/coarse pointers via CSS media queries.
 */
export const CustomCursor = () => {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const target = useRef({ x: -100, y: -100 });
  const current = useRef({ x: -100, y: -100 });
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mm = window.matchMedia("(hover: hover) and (pointer: fine)");
    setSupported(mm.matches);
    const onChange = () => setSupported(mm.matches);
    mm.addEventListener("change", onChange);
    return () => mm.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!supported) return;
    document.documentElement.classList.add("lifestack-cursor");
    return () => document.documentElement.classList.remove("lifestack-cursor");
  }, [supported]);

  useEffect(() => {
    if (!supported) return;

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      // inner dot is precise (no lag)
      if (innerRef.current) {
        innerRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Detect element under cursor for hover affordance
      const el = e.target as Element | null;
      if (!outerRef.current || !el) return;

      const isText =
        el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
      const isHover =
        !!el.closest('a, button, [role="button"], [data-cursor="hover"], label[for], summary');

      outerRef.current.classList.toggle("is-text", isText);
      outerRef.current.classList.toggle("is-hover", !isText && isHover);
      if (innerRef.current) {
        innerRef.current.classList.toggle("is-text", isText);
        innerRef.current.classList.toggle("is-hover", !isText && isHover);
      }
    };

    const onDown = () => outerRef.current?.classList.add("is-press");
    const onUp = () => outerRef.current?.classList.remove("is-press");
    const onLeave = () => {
      if (outerRef.current) outerRef.current.style.opacity = "0";
      if (innerRef.current) innerRef.current.style.opacity = "0";
    };
    const onEnter = () => {
      if (outerRef.current) outerRef.current.style.opacity = "1";
      if (innerRef.current) innerRef.current.style.opacity = "1";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    let raf = 0;
    const tick = () => {
      // Spring follow for outer ring (~0.18 lag)
      current.current.x += (target.current.x - current.current.x) * 0.18;
      current.current.y += (target.current.y - current.current.y) * 0.18;
      if (outerRef.current) {
        outerRef.current.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, [supported]);

  if (!supported) return null;
  return (
    <>
      <div ref={outerRef} className="ls-cursor-outer" aria-hidden />
      <div ref={innerRef} className="ls-cursor-inner" aria-hidden />
    </>
  );
};
