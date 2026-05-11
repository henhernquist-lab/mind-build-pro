import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Network, Sparkles, Download, Maximize2, Minimize2,
  ZoomIn, ZoomOut, BookmarkPlus, RotateCcw, Camera, Maximize,
  Image as ImageIcon, Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import mermaid from "mermaid";
import * as d3 from "d3";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import { useAuth } from "@/lib/auth";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let mermaidInitialized = false;
const initMermaid = () => {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: {
      primaryColor: "rgba(0, 229, 255, 0.15)",
      primaryTextColor: "#E2E8F0",
      primaryBorderColor: "#00E5FF",
      lineColor: "rgba(0, 229, 255, 0.3)",
      secondaryColor: "rgba(13, 21, 32, 0.8)",
      tertiaryColor: "#1E293B",
      background: "transparent",
      mainBkg: "rgba(13, 21, 32, 0.8)",
      nodeBorder: "rgba(0, 229, 255, 0.4)",
      clusterBkg: "transparent",
      titleColor: "#E2E8F0",
      edgeLabelBackground: "transparent",
      fontFamily: "'Barlow Condensed', sans-serif",
    },
    mindmap: {
      padding: 30,
      useMaxWidth: true,
    },
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
  const { user } = useAuth();
  const [topic, setTopic] = useState(defaultTopic ?? "");
  const [loading, setLoading] = useState(false);
  const [renderedSvg, setRenderedSvg] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initMermaid();
  }, []);

  const applyCustomStyles = useCallback(() => {
    if (!svgRef.current) return;

    // Use a small timeout to ensure Mermaid has finished DOM injection
    setTimeout(() => {
      const svg = d3.select(svgRef.current).select("svg");
      if (svg.empty()) return;

      // Apply staggering animations
      svg.selectAll(".node")
        .style("opacity", 0)
        .style("transform", "scale(0.5)")
        .transition()
        .duration(500)
        .delay((d, i) => i * 100)
        .style("opacity", 1)
        .style("transform", "scale(1)");

      svg.selectAll(".edgePath path, .mindmap-edge")
        .style("stroke-dasharray", function() {
          try { return (this as any).getTotalLength(); } catch(e) { return 1000; }
        })
        .style("stroke-dashoffset", function() {
          try { return (this as any).getTotalLength(); } catch(e) { return 1000; }
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 100 + 300)
        .style("stroke-dashoffset", 0);
    }, 50);
  }, [renderedSvg]);

  useEffect(() => {
    if (renderedSvg) {
      applyCustomStyles();
    }
  }, [renderedSvg, applyCustomStyles]);

  const generate = async (sourceText?: string) => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setRenderedSvg(null);
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
      if (!resp.ok) throw new Error("Failed to generate");
      const data = await resp.json();

      if (data?.mermaid) {
        const id = `mm-${Date.now()}`;
        const { svg } = await mermaid.render(id, data.mermaid);
        setRenderedSvg(svg);
      }
    } catch (e: any) {
      toast({ title: "Couldn't build mind map", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const downloadPng = async () => {
    if (!svgRef.current) return;
    const canvas = await html2canvas(svgRef.current, {
      backgroundColor: "#0D1520",
      scale: 2,
    });
    const link = document.createElement("a");
    link.download = `${topic}-mindmap.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const saveToNotes = async () => {
    if (!renderedSvg || !user) return;
    try {
      const { error } = await supabase.from("study_notes").insert({
        user_id: user.id,
        subject: subjectLabel || "General",
        title: `Mind Map: ${topic}`,
        content: `Visual mind map for ${topic}`,
        ai_summary: topic
      });
      if (error) throw error;
      toast({ title: "Saved to Notes" });
    } catch (e: any) {
      toast({ title: "Error saving", description: e.message });
    }
  };

  return (
    <div className={cn(
      "mermaid-container flex flex-col gap-4 transition-all",
      fullscreen ? "fixed inset-0 z-50 bg-[#0D1520] p-6" : "p-4"
    )}>
      <style dangerouslySetInnerHTML={{ __html: `
        .mermaid-container .node rect,
        .mermaid-container .node circle,
        .mermaid-container .node ellipse,
        .mermaid-container .node polygon {
          fill: rgba(13, 21, 32, 0.8) !important;
          stroke: rgba(0, 229, 255, 0.4) !important;
          stroke-width: 1.5px !important;
          filter: drop-shadow(0 0 8px rgba(0, 229, 255, 0.2));
        }

        .mermaid-container .node .label {
          color: #E2E8F0 !important;
          font-family: 'Barlow Condensed', sans-serif !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }

        .mermaid-container .edgePath path, .mermaid-container .mindmap-edge {
          stroke: rgba(0, 229, 255, 0.3) !important;
          stroke-width: 1.5px !important;
        }

        .mermaid-container .node:first-child rect,
        .mermaid-container .node:first-child circle {
          fill: rgba(0, 229, 255, 0.15) !important;
          stroke: #00E5FF !important;
          stroke-width: 2px !important;
          filter: drop-shadow(0 0 16px rgba(0, 229, 255, 0.4));
        }

        .mindmap-bg {
          background-image: radial-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}} />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          <Input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Enter topic..."
            className="w-64"
          />
          <Button onClick={() => generate()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate
          </Button>
        </div>

        {renderedSvg && (
          <div className="flex items-center gap-1 bg-accent/20 p-1 rounded-xl">
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => z + 0.2)}><ZoomIn className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom(1)}><RotateCcw className="h-4 w-4" /></Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="icon" onClick={downloadPng}><ImageIcon className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={saveToNotes}><Save className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setFullscreen(!fullscreen)}>
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className={cn(
          "relative flex-1 min-h-[400px] rounded-2xl border bg-card/50 overflow-hidden mindmap-bg flex items-center justify-center",
          fullscreen ? "h-full" : "h-[600px]"
        )}
      >
        {renderedSvg ? (
          <div
            ref={svgRef}
            className="transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: renderedSvg }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-30">
            <Network className="h-16 w-16 mb-4" />
            <p className="font-bold uppercase tracking-widest">Enter a topic to visualize</p>
          </div>
        )}
      </div>
    </div>
  );
};
