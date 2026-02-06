"use client";

import { cn } from "@/lib/utils";
import {
  PenToolIcon,
  RulerIcon,
  RotateIcon,
  CrosshairIcon,
  MapPinIcon,
} from "@/components/climb/icons";
import { useState } from "react";

const tools = [
  { id: "polygon", icon: PenToolIcon, label: "Draw Polygon" },
  { id: "point", icon: MapPinIcon, label: "Point Select" },
  { id: "measure", icon: RulerIcon, label: "Measure Distance" },
  { id: "sample", icon: CrosshairIcon, label: "Virtual Sampling" },
  { id: "reset", icon: RotateIcon, label: "Reset View" },
];

export function FloatingTools({ className }: { className?: string }) {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl bg-card/90 p-1.5 shadow-climb-2 backdrop-blur-md border border-border",
        className
      )}
    >
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(isActive ? null : tool.id)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-climb-fast",
              "hover:scale-[1.05] active:scale-95",
              isActive
                ? "bg-primary text-primary-foreground shadow-climb-1"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={tool.label}
            aria-label={tool.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
