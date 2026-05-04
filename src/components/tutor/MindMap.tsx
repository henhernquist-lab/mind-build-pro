import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Network, Sparkles, Download, Maximize2, Minimize2, ZoomIn, ZoomOut, BookmarkPlus, RotateCcw, Camera, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import mermaid from "mermaid";
import { supabase } from "@/integrations/supabase/client";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Subject-specific color themes for mermaid
const SUBJECT_THEMES: Record<string, { primary: string; secondary: string; accent: string }> = {
  algebra: { primary: "#3B82F6", secondary: "#06B6D4", accent: "#1E40AF" },
  math: { primary: "#3B82F6", secondary: "#06B6D4", accent: "#1E40AF" },
  "physical science": { primary: "#3B82F6", secondary: "#06B6D4", accent: "#1E40AF" },
  science: { primary: "#3B82F6", secondary: "#06B6D4", accent: "#1E40AF" },
  "lang & lit": { primary: "#A855F7", secondary: "#EAB308", accent: "#7C3AED" },
  english: { primary: "#A855F7", secondary: "#EAB308", accent: "#7C3AED" },
  literature: { primary: "#A855F7", secondary: "#EAB308", accent: "#7C3AED" },
  "georgia studies": { primary: "#22C55E", secondary: "#EF4444", accent: "#15803D" },
  history: { primary: "#22C55E", secondary: "#EF4444", accent: "#15803D" },
  spanish: { primary: "#F97316", secondary: "#EAB308", accent: "#C2410C" },
};

const getSubjectTheme = (label?: string) => {
  if (!label) return null;
  const key = label.toLowerCase();
  for (const [k, v] of Object.entries(SUBJECT_THEMES)) {
    if (key.includes(k)) return v;
  }
  return null;
};

let mermaidInitialized = false;
const initMermaid = (theme?: { primary: string; secondary: string; accent: string } | null) => {
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: {
      primaryColor: theme?.primary ?? "hsl(263 90% 65%)",
      primaryTextColor: "#ffffff",
      primaryBorderColor: theme?.accent ?? "hsl(263 90% 50%)",
      lineColor: theme?.secondary ?? "hsl(185 80% 55%)",
      secondaryColor: theme?.secondary ?? "hsl(185 80% 55%)",
      tertiaryColor: "#1E293B",
      background: "#0F172A",
      mainBkg: theme?.primary ?? "hsl(263 90% 65%)",
      nodeBorder: theme?.accent ?? "hsl(263 90% 50%)",
      clusterBkg: "#1E293B",
      titleColor: "#E2E8F0",
      edgeLabelBackground: "#1E293B",
      fontFamily: "Inter, system-ui, sans-serif",
    },
    mindmap: { padding: 16, useMaxWidth: true },
    securityLevel: "loose",
  });
  mermaidInitialized = true;
};

export const MindMap = ({
  subjectLabel,
  defaultTopic,
  onClose,
  onSaveToNotes,
}: {
  subjectLabel?: string;
  defaultTopic?: string;
  onClose?: () => void;
  onSaveToNotes?: (topic: string, svgContent: string) => void;
}) => {
  const [topic, setTopic] = useState(defaultTopic ?? "");
  const [loading, setLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState<string | null>(null);
  const [renderedSvg, setRenderedSvg] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fromPhoto, setFromPhoto] = useState(false);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const subjectTheme = getSubjectTheme(subjectLabel);

  useEffect(() => {
    initMermaid(subjectTheme);
  }, [subjectLabel]);

  const renderMermaid = useCallback(async (code: string) => {
    if (!code) return;
    try {
      const id = `mm-${Date.now()}`;
      const { svg } = await mermaid.render(id, code);
      setRenderedSvg(svg);
    } catch (e: any) {
      // Mermaid render failed - toast shown below
      toast({ title: "Couldn't render mind map", description: "The AI returned an invalid diagram. Try again." });
    }
  }, [toast]);

  const generate = async (sourceText?: string, isPhoto = false) => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setMermaidCode(null);
    setRenderedSvg(null);
    setFromPhoto(isPhoto);
    setZoom(1);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token ?? ANON_KEY;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          mindmap: topic.trim(),
          customLabel: subjectLabel,
          sourceText: sourceText ?? undefined,
          format: "mermaid",
        }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || "Failed");
      }
      const data = await resp.json();

      // Accept either mermaid code or legacy JSON branches
      let code: string | null = null;
      if (data?.mermaid) {
        code = data.mermaid;
      } else if (data?.branches) {
        // Convert legacy JSON to Mermaid syntax
        code = jsonToMermaid(topic.trim(), data);
      }

      if (!code) throw new Error("No mind map data returned");
      setMermaidCode(code);
      await renderMermaid(code);
    } catch (e: any) {
      toast({ title: "Couldn't build mind map", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file" });
      return;
    }
    setLoading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = () => rej(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1];
      // Use the topic if set, otherwise use filename
      if (!topic.trim()) setTopic(file.name.replace(/\.[^.]+$/, ""));
      await generate(base64, true);
    } catch (e: any) {
      toast({ title: "Photo error", description: e.message });
      setLoading(false);
    }
  };

  const downloadPng = () => {
    if (!renderedSvg) return;
    const canvas = document.createElement("canvas");
    const scale = 2;
    const parser = new DOMParser();
    const doc = parser.parseFromString(renderedSvg, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    const W = (parseInt(svgEl?.getAttribute("width") ?? "800")) * scale;
    const H = (parseInt(svgEl?.getAttribute("height") ?? "600")) * scale;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, W, H);
    const img = new Image();
    const blob = new Blob([renderedSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `${(topic || "mindmap").replace(/\s+/g, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  };

  const downloadSvg = () => {
    if (!renderedSvg) return;
    const blob = new Blob([renderedSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(topic || "mindmap").replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToNotes = () => {
    if (!renderedSvg || !onSaveToNotes) return;
    onSaveToNotes(topic, renderedSvg);
    toast({ title: "Saved to Visual Gallery", description: `Mind map for "${topic}" saved.` });
  };

  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card space-y-4 transition-all",
      fullscreen ? "fixed inset-4 z-50 overflow-y-auto p-6 shadow-2xl" : "p-4 md:p-6",
    )}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Mind Map</h2>
            <p className="text-xs text-muted-foreground">Visualize a topic as an interactive Mermaid diagram</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {renderedSvg && (
            <>
              <Button size="sm" variant="outline" onClick={downloadSvg} title="Download SVG">
                <Download className="h-3.5 w-3.5 mr-1.5" /> SVG
              </Button>
              <Button size="sm" variant="outline" onClick={downloadPng} title="Download PNG">
                <Download className="h-3.5 w-3.5 mr-1.5" /> PNG
              </Button>
              {onSaveToNotes && (
                <Button size="sm" variant="outline" onClick={handleSaveToNotes} title="Save to Visual Gallery">
                  <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" /> Gallery
                </Button>
              )}
              <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
                <button
                  onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
                  className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-mono px-1 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                  className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset zoom"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
          <button
            onClick={() => setFullscreen((f) => !f)}
            className="p-1.5 rounded-lg border border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs">Topic</Label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={subjectLabel ? `e.g. linear equations` : "Any concept you want to map…"}
            onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
            disabled={loading}
          />
        </div>
        <Button onClick={() => generate()} disabled={!topic.trim() || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          {loading ? "" : "Generate"}
        </Button>
        {/* Photo to Mind Map */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoFile(e.target.files?.[0])} />
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoFile(e.target.files?.[0])} />
        <Button variant="outline" size="icon" onClick={() => uploadRef.current?.click()} disabled={loading} title="Photo to Mind Map — upload a photo of your notes">
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      {/* Mermaid render area */}
      {renderedSvg ? (
        <div className="rounded-xl border border-border bg-background overflow-auto">
          {fromPhoto && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-primary/5 text-xs text-primary font-medium">
              <Camera className="h-3.5 w-3.5" /> Generated from photo
            </div>
          )}
          <div
            ref={containerRef}
            className="overflow-auto p-4"
            style={{ minHeight: 300 }}
          >
            <div
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 200ms ease", display: "inline-block" }}
              dangerouslySetInnerHTML={{ __html: renderedSvg }}
            />
          </div>
        </div>
      ) : !loading ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Network className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Enter a topic above and tap Generate — or upload a photo of your notes to auto-generate a mind map.
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Building your mind map…
        </div>
      )}

      {/* Mermaid code toggle */}
      {mermaidCode && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">Show Mermaid code</summary>
          <pre className="mt-2 p-3 rounded-lg bg-muted/40 overflow-x-auto font-mono text-[11px] whitespace-pre-wrap">{mermaidCode}</pre>
        </details>
      )}
    </div>
  );
};

/** Convert legacy JSON mind map format to Mermaid mindmap syntax */
function jsonToMermaid(topic: string, data: { branches: { title: string; children: { title: string }[] }[]; summary?: string }): string {
  const sanitize = (s: string) => s.replace(/[()[\]{}]/g, "").slice(0, 40);
  const lines: string[] = ["mindmap", `  root((${sanitize(topic)}))`];
  for (const branch of data.branches.slice(0, 6)) {
    lines.push(`    ${sanitize(branch.title)}`);
    for (const child of (branch.children ?? []).slice(0, 4)) {
      lines.push(`      ${sanitize(child.title)}`);
    }
  }
  return lines.join("\n");
}
