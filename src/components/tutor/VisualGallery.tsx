import { useState } from "react";
import { Trash2, Download, Eye, ImageOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type GalleryItem = {
  topic: string;
  svg: string;
  subject: string;
  savedAt: string;
};

export const VisualGallery = ({
  maps,
  onDelete,
}: {
  maps: GalleryItem[];
  onDelete: (index: number) => void;
}) => {
  const [preview, setPreview] = useState<GalleryItem | null>(null);

  const downloadSvg = (item: GalleryItem) => {
    const blob = new Blob([item.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.topic.replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = (item: GalleryItem) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(item.svg, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return;
    const vb = svgEl.getAttribute("viewBox")?.split(" ") ?? ["0", "0", "900", "600"];
    const W = parseInt(vb[2]) * 2;
    const H = parseInt(vb[3]) * 2;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);
    const img = new Image();
    const svgBlob = new Blob([item.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `${item.topic.replace(/\s+/g, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  };

  if (maps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <ImageOff className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-lg font-bold">No saved mind maps yet</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Generate a mind map in the Mind Map tab, then click{" "}
          <span className="font-medium text-foreground">Notes</span> to save it here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Visual Gallery
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{maps.length} saved mind map{maps.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {maps.map((item, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden group">
            {/* SVG Thumbnail */}
            <div
              className="relative bg-background p-2 cursor-pointer overflow-hidden"
              style={{ maxHeight: 180 }}
              onClick={() => setPreview(item)}
            >
              <div
                dangerouslySetInnerHTML={{ __html: item.svg }}
                className="w-full pointer-events-none"
                style={{ transform: "scale(0.5)", transformOrigin: "top left", width: "200%", height: "200%" }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-background/80 rounded-full p-2">
                  <Eye className="h-5 w-5 text-foreground" />
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="p-3 border-t border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{item.topic}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {item.subject} · {new Date(item.savedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2">
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => downloadSvg(item)}>
                  <Download className="h-3 w-3 mr-1" /> SVG
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => downloadPng(item)}>
                  <Download className="h-3 w-3 mr-1" /> PNG
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(i)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.topic}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="rounded-xl border border-border bg-background overflow-auto max-h-[70vh]">
              <div dangerouslySetInnerHTML={{ __html: preview.svg }} className="w-full" />
            </div>
          )}
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" size="sm" onClick={() => preview && downloadSvg(preview)}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> SVG
            </Button>
            <Button variant="outline" size="sm" onClick={() => preview && downloadPng(preview)}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> PNG
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
