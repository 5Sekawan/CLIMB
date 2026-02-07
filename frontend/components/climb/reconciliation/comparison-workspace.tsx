"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import DeckGL from '@deck.gl/react';
import { PointCloudLayer } from '@deck.gl/layers';
import { OrthographicView } from '@deck.gl/core';

interface ComparisonWorkspaceProps {
  className?: string;
  data?: any[]; // { lat, lon, z, actualAu, predAu, varianceAu }
}

type ViewMode = "predicted" | "actual" | "variance";

export function ComparisonWorkspace({ className, data = [] }: ComparisonWorkspaceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("variance");

  const modes: { id: ViewMode; label: string }[] = [
    { id: "predicted", label: "Predicted" },
    { id: "actual", label: "Actual" },
    { id: "variance", label: "Variance Heatmap" },
  ];

  // DeckGL Layer
  const layer = new PointCloudLayer({
    id: 'comparison-layer',
    data: data,
    pickable: true,
    getPosition: (d: any) => [d.lon, d.lat, d.z * 5], // Exaggerate Z
    getNormal: [0, 1, 0],
    pointSize: 8,
    getColor: (d: any) => {
      if (viewMode === 'variance') {
        // Red = Overpredicted (Model > Actual -> Variance Negative? No, Variance = Actual - Pred)
        // If Actual (2) - Pred (3) = -1. Model Overpredicted. Red.
        // If Actual (3) - Pred (2) = +1. Model Underpredicted. Blue.
        const v = d.varianceAu;
        if (v < -0.5) return [255, 50, 50]; // Red
        if (v > 0.5) return [50, 50, 255]; // Blue
        return [200, 200, 200]; // Grey
      }
      const val = viewMode === 'actual' ? d.actualAu : d.predAu;
      const n = Math.min(Math.max(val || 0, 0), 5) / 5;
      return [255 * n, 255 * (1 - Math.abs(0.5 - n) * 2), 255 * (1 - n)];
    },
  });

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-climb-fast",
              viewMode === mode.id
                ? "bg-card text-foreground shadow-climb-1"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* 3D Comparison Visualization */}
      <div className="relative aspect-video w-full rounded-xl bg-slate-950 overflow-hidden border border-border">
        {data.length > 0 ? (
          <DeckGL
            controller={true}
            initialViewState={{
              target: [data[0]?.lon || 0, data[0]?.lat || 0, 0],
              zoom: 15,
              pitch: 45,
              bearing: 0
            }}
            layers={[layer]}
            getTooltip={({object}: any) => object && {
              html: `
                <div style="font-size: 12px">
                  <b>Var:</b> ${object.varianceAu.toFixed(2)}<br/>
                  <b>Act:</b> ${object.actualAu.toFixed(2)}<br/>
                  <b>Pred:</b> ${object.predAu?.toFixed(2)}
                </div>
              `
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Upload actuals to visualize comparison
          </div>
        )}

        {/* Legend */}
        {viewMode === "variance" && (
          <div className="absolute bottom-3 right-3 flex items-center gap-3 rounded-lg bg-black/50 px-3 py-2 font-mono text-[10px] text-white/70 backdrop-blur-sm pointer-events-none">
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-red-500" />
              <span>Over-est.</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-slate-400" />
              <span>Match</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-blue-500" />
              <span>Under-est.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}