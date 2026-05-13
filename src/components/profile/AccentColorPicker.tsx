import { useState } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/themes";
import { cn } from "@/lib/utils";

const PRESETS: { name: string; hue: number }[] = [
  { name: "Sky",     hue: 210 },
  { name: "Violet",  hue: 270 },
  { name: "Magenta", hue: 320 },
  { name: "Rose",    hue: 350 },
  { name: "Amber",   hue: 35 },
  { name: "Lime",    hue: 95 },
  { name: "Emerald", hue: 155 },
  { name: "Cyan",    hue: 185 },
];

export const AccentColorPicker = () => {
  const { accentHue, setAccentHue } = useTheme();
  // Local working value for live preview while dragging
  const [draft, setDraft] = useState<number | null>(accentHue);

  const current = draft ?? accentHue ?? 217;
  const previewColor = `hsl(${current} 85% 60%)`;

  const live = (h: number) => {
    setDraft(h);
    // Apply preview immediately by writing to the override style
    const tag = document.getElementById("lov-accent-override") as HTMLStyleElement | null;
    const css = `:root, [data-theme] {
      --primary: ${h} 85% 60% !important;
      --ring: ${h} 85% 60% !important;
      --sidebar-primary: ${h} 85% 60% !important;
      --sidebar-ring: ${h} 85% 60% !important;
      --accent: ${h} 70% 50% !important;
    }`;
    if (tag) tag.textContent = css;
    else {
      const t = document.createElement("style");
      t.id = "lov-accent-override";
      t.textContent = css;
      document.head.appendChild(t);
    }
  };

  const save = () => setAccentHue(draft ?? current);
  const reset = () => { setDraft(null); setAccentHue(null); };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Accent Color</h2>
            <p className="text-xs text-muted-foreground">
              Override the active theme's primary color. Applied instantly across the app.
            </p>
          </div>
        </div>
        <div
          className="h-12 w-12 rounded-xl border-2 border-border shadow-lg"
          style={{ background: previewColor }}
        />
      </div>

      {/* Hue slider — full spectrum gradient */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
          <span>Hue</span>
          <span className="tabular-nums">{Math.round(current)}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={current}
          onChange={(e) => live(Number(e.target.value))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background:
              "linear-gradient(to right, hsl(0 85% 60%), hsl(60 85% 60%), hsl(120 85% 60%), hsl(180 85% 60%), hsl(240 85% 60%), hsl(300 85% 60%), hsl(360 85% 60%))",
          }}
        />
      </div>

      {/* Preset swatches */}
      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Presets</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => live(p.hue)}
              className={cn(
                "group flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-muted transition-colors",
                Math.round(current) === p.hue && "ring-2 ring-primary",
              )}
              title={p.name}
            >
              <div
                className="h-7 w-7 rounded-full border border-border shadow"
                style={{ background: `hsl(${p.hue} 85% 60%)` }}
              />
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset to theme
        </Button>
        <Button variant="premium" size="sm" onClick={save} className="font-bold">
          Save accent
        </Button>
      </div>
    </section>
  );
};

export default AccentColorPicker;