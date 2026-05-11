import React from "react";
import { cn } from "@/lib/utils";

const BODY_PARTS_SVG = [
  { id: "Head/Neck", path: "M50 5 L50 15", label: "Head/Neck", cx: 50, cy: 10 },
  { id: "Shoulder (L)", cx: 35, cy: 22, label: "Shoulder (L)" },
  { id: "Shoulder (R)", cx: 65, cy: 22, label: "Shoulder (R)" },
  { id: "Elbow (L)", cx: 28, cy: 35, label: "Elbow (L)" },
  { id: "Elbow (R)", cx: 72, cy: 35, label: "Elbow (R)" },
  { id: "Wrist (L)", cx: 22, cy: 48, label: "Wrist (L)" },
  { id: "Wrist (R)", cx: 78, cy: 48, label: "Wrist (R)" },
  { id: "Back (Upper/Lower)", cx: 50, cy: 30, label: "Back" },
  { id: "Hip (L)", cx: 42, cy: 50, label: "Hip (L)" },
  { id: "Hip (R)", cx: 58, cy: 50, label: "Hip (R)" },
  { id: "Knee (L)", cx: 40, cy: 75, label: "Knee (L)" },
  { id: "Knee (R)", cx: 60, cy: 75, label: "Knee (R)" },
  { id: "Ankle (L)", cx: 40, cy: 92, label: "Ankle (L)" },
  { id: "Ankle (R)", cx: 60, cy: 92, label: "Ankle (R)" },
  { id: "Foot (L)", cx: 38, cy: 98, label: "Foot (L)" },
  { id: "Foot (R)", cx: 62, cy: 98, label: "Foot (R)" },
];

export const BodySilhouette = ({
  selected,
  onSelect
}: {
  selected: string;
  onSelect: (id: string) => void
}) => {
  return (
    <div className="relative w-full max-w-[240px] mx-auto aspect-[1/2] bg-accent/10 rounded-3xl p-4 border border-border">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Simple Humanoid Silhouette */}
        <circle cx="50" cy="10" r="7" className="fill-muted-foreground/20" />
        <path d="M40 20 L60 20 L65 50 L55 50 L58 95 L50 95 L42 95 L45 50 L35 50 Z" className="fill-muted-foreground/20" />
        <path d="M35 20 L20 50" className="stroke-muted-foreground/20 stroke-[6] stroke-linecap-round" />
        <path d="M65 20 L80 50" className="stroke-muted-foreground/20 stroke-[6] stroke-linecap-round" />

        {/* Interaction Hotspots */}
        {BODY_PARTS_SVG.map((part) => (
          <g
            key={part.id}
            className="cursor-pointer group"
            onClick={() => onSelect(part.id)}
          >
            <circle
              cx={part.cx}
              cy={part.cy}
              r="4"
              className={cn(
                "transition-all duration-300",
                selected === part.id ? "fill-red-500 scale-125" : "fill-muted-foreground/40 hover:fill-red-400"
              )}
            />
            {selected === part.id && (
              <circle
                cx={part.cx}
                cy={part.cy}
                r="6"
                className="fill-none stroke-red-500 stroke-1 animate-ping"
              />
            )}
          </g>
        ))}
      </svg>
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
          {selected || "Select Area"}
        </span>
      </div>
    </div>
  );
};
