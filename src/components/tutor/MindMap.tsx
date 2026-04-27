import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Network, Sparkles, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Child = { title: string; detail?: string };
type Branch = { title: string; color?: string; children: Child[] };
type Map = { topic: string; summary?: string; branches: Branch[] };

const COLOR_MAP: Record<string, string> = {
  blue: "hsl(210 90% 60%)",
  green: "hsl(145 70% 50%)",
  orange: "hsl(28 95% 60%)",
  purple: "hsl(270 75% 65%)",
  pink: "hsl(330 80% 65%)",
  cyan: "hsl(185 80% 55%)",
};
const fallbackColors = ["blue", "green", "orange", "purple", "pink", "cyan"];

export const MindMap = ({
  subjectLabel,
  defaultTopic,
  onClose,
}: {
  subjectLabel?: string;
  defaultTopic?: string;
  onClose?: () => void;
}) => {
  const [topic, setTopic] = useState(defaultTopic ?? "");
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState<Map | null>(null);
  const { toast } = useToast();

  const generate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setMap(null);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}` } : {}),
        },
        body: JSON.stringify({ mindmap: topic.trim(), customLabel: subjectLabel }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || "Failed");
      }
      const data = await resp.json();
      if (!data?.branches || !Array.isArray(data.branches)) {
        throw new Error("Invalid mind map");
      }
      setMap(data);
    } catch (e: any) {
      toast({ title: "Couldn't build mind map", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const copySvg = () => {
    const svg = document.getElementById("mindmap-svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(map?.topic || "mindmap").replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Mind Map</h2>
            <p className="text-xs text-muted-foreground">Visualize a topic as a branching diagram</p>
          </div>
        </div>
        {map && (
          <Button size="sm" variant="outline" onClick={copySvg}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Save SVG
          </Button>
        )}
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">Topic</Label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={subjectLabel ? `e.g. linear equations` : "Any concept you want to map…"}
            onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
            disabled={loading}
          />
        </div>
        <Button onClick={generate} disabled={!topic.trim() || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          {loading ? "" : "Generate"}
        </Button>
      </div>

      {map ? (
        <MindMapSvg map={map} />
      ) : !loading ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Enter a topic above and tap Generate to build a visual mind map.
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Building your mind map…
        </div>
      )}
    </div>
  );
};

const MindMapSvg = ({ map }: { map: Map }) => {
  const branches = map.branches.slice(0, 8);
  const W = 900;
  const H = Math.max(520, 180 + branches.length * 90);
  const cx = W / 2;
  const cy = H / 2;

  // Place branches in a circle around center
  const positions = branches.map((b, i) => {
    const angle = (i / branches.length) * Math.PI * 2 - Math.PI / 2;
    const radius = Math.min(W, H) * 0.32;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      angle,
      branch: b,
      color: COLOR_MAP[b.color || ""] || COLOR_MAP[fallbackColors[i % fallbackColors.length]],
    };
  });

  return (
    <div className="rounded-xl border border-border bg-background overflow-x-auto">
      <svg
        id="mindmap-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto min-w-[600px]"
      >
        {/* Connectors */}
        {positions.map((p, i) => (
          <path
            key={`conn-${i}`}
            d={`M ${cx} ${cy} Q ${(cx + p.x) / 2} ${(cy + p.y) / 2 + (p.y < cy ? -30 : 30)} ${p.x} ${p.y}`}
            stroke={p.color}
            strokeWidth="2.5"
            fill="none"
            opacity="0.7"
          />
        ))}
        {/* Children connectors */}
        {positions.map((p, i) => {
          const childCount = p.branch.children.length;
          return p.branch.children.map((_, j) => {
            const offset = (j - (childCount - 1) / 2) * 50;
            const dirX = p.x > cx ? 1 : -1;
            const childX = p.x + dirX * 130;
            const childY = p.y + offset;
            return (
              <line
                key={`child-c-${i}-${j}`}
                x1={p.x}
                y1={p.y}
                x2={childX - dirX * 70}
                y2={childY}
                stroke={p.color}
                strokeWidth="1.5"
                opacity="0.5"
              />
            );
          });
        })}
        {/* Children nodes */}
        {positions.map((p, i) => {
          const childCount = p.branch.children.length;
          const dirX = p.x > cx ? 1 : -1;
          return p.branch.children.map((c, j) => {
            const offset = (j - (childCount - 1) / 2) * 50;
            const childX = p.x + dirX * 130;
            const childY = p.y + offset;
            const text = c.title.length > 24 ? c.title.slice(0, 22) + "…" : c.title;
            return (
              <g key={`child-${i}-${j}`}>
                <rect
                  x={childX - 70}
                  y={childY - 16}
                  width="140"
                  height="32"
                  rx="8"
                  fill={p.color}
                  fillOpacity="0.15"
                  stroke={p.color}
                  strokeWidth="1"
                />
                <text
                  x={childX}
                  y={childY + 4}
                  textAnchor="middle"
                  fill="hsl(var(--foreground))"
                  fontSize="11"
                  fontWeight="500"
                >
                  {text}
                </text>
                {c.detail && (
                  <title>{c.detail}</title>
                )}
              </g>
            );
          });
        })}
        {/* Branch nodes */}
        {positions.map((p, i) => {
          const text = p.branch.title.length > 18 ? p.branch.title.slice(0, 16) + "…" : p.branch.title;
          return (
            <g key={`branch-${i}`}>
              <ellipse
                cx={p.x}
                cy={p.y}
                rx="75"
                ry="26"
                fill={p.color}
                fillOpacity="0.85"
                stroke={p.color}
                strokeWidth="2"
              />
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                fill="white"
                fontSize="13"
                fontWeight="600"
              >
                {text}
              </text>
            </g>
          );
        })}
        {/* Center node */}
        <circle cx={cx} cy={cy} r="60" fill="hsl(var(--primary))" />
        <circle cx={cx} cy={cy} r="60" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" opacity="0.4" />
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fill="hsl(var(--primary-foreground))"
          fontSize="14"
          fontWeight="700"
        >
          {map.topic.length > 16 ? map.topic.slice(0, 14) + "…" : map.topic}
        </text>
      </svg>
      {map.summary && (
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground bg-muted/30">
          {map.summary}
        </div>
      )}
    </div>
  );
};