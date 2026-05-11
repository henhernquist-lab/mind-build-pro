import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Snappy page transition: outgoing fades+rises 10px (150ms),
 * incoming fades+rises in from 10px below (200ms).
 */
export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [stage, setStage] = useState<"in" | "out">("in");
  const [displayChildren, setDisplayChildren] = useState(children);
  const [pathKey, setPathKey] = useState(location.pathname);

  useEffect(() => {
    if (location.pathname === pathKey) {
      // same route — just update children
      setDisplayChildren(children);
      return;
    }
    setStage("out");
    const t = window.setTimeout(() => {
      setDisplayChildren(children);
      setPathKey(location.pathname);
      setStage("in");
    }, 180);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, children]);

  return (
    <div
      className={cn(
        "page-transition",
        stage === "in" ? "page-transition-in" : "page-transition-out",
      )}
    >
      {displayChildren}
    </div>
  );
};