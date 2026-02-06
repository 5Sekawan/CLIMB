"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface ComparisonWorkspaceProps {
  className?: string;
}

type ViewMode = "predicted" | "actual" | "variance";

// Deterministic seeded pseudo-random number generator to avoid hydration mismatch
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Pre-compute deterministic voxel data at module level
const voxels = Array.from({ length: 48 }).map((_, i) => {
  const row = Math.floor(i / 8);
  const col = i % 8;
  const predicted = 2.5 + Math.sin(row + col) * 1.5;
  const randomOffset = seededRandom(i + 42) - 0.45;
  const actual = predicted + randomOffset * 1.2;
  const variance = actual - predicted;
  return { row, col, predicted, actual, variance };
});

export function ComparisonWorkspace({ className }: ComparisonWorkspaceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("variance");

  const modes: { id: ViewMode; label: string }[] = [
    { id: "predicted", label: "Predicted" },
    { id: "actual", label: "Actual" },
    { id: "variance", label: "Variance Heatmap" },
  ];

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
      <div className="relative aspect-video w-full rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 overflow-hidden">
        {/* Grid */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="grid grid-cols-8 grid-rows-6 gap-1">
            {voxels.map((v, i) => {
              let bgColor: string;
              let opacity: number;

              if (viewMode === "predicted") {
                const normalized = (v.predicted - 1) / 4;
                bgColor =
                  normalized > 0.5
                    ? "bg-climb-mint"
                    : normalized > 0.25
                      ? "bg-climb-marginal"
                      : "bg-climb-waste";
                opacity = Math.max(0.3, normalized);
              } else if (viewMode === "actual") {
                const normalized = (v.actual - 1) / 4;
                bgColor =
                  normalized > 0.5
                    ? "bg-climb-mint"
                    : normalized > 0.25
                      ? "bg-climb-marginal"
                      : "bg-climb-waste";
                opacity = Math.max(0.3, normalized);
              } else {
                // Variance: red = overpredict, blue = underpredict
                bgColor =
                  v.variance > 0.3
                    ? "bg-blue-500"
                    : v.variance < -0.3
                      ? "bg-red-500"
                      : "bg-slate-500";
                opacity = Math.min(1, Math.abs(v.variance) / 1.5 + 0.2);
              }

              return (
                <div
                  key={i}
                  className={cn(
                    "h-6 w-8 rounded-sm border border-white/10 transition-all duration-climb-fast",
                    "hover:scale-110 hover:z-10",
                    bgColor
                  )}
                  style={{
                    opacity,
                    transform: `perspective(600px) rotateX(30deg) rotateZ(-10deg)`,
                  }}
                  title={`Block (${v.col},${v.row}): Pred=${v.predicted.toFixed(2)} | Act=${v.actual.toFixed(2)} | Var=${v.variance > 0 ? "+" : ""}${v.variance.toFixed(2)}`}
                />
              );
            })}
          </div>
        </div>

        {/* Legend */}
        {viewMode === "variance" && (
          <div className="absolute bottom-3 right-3 flex items-center gap-3 rounded-lg bg-black/50 px-3 py-2 font-mono text-[10px] text-white/70 backdrop-blur-sm">
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-red-500" />
              <span>Over-predict</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-slate-500" />
              <span>Neutral</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-blue-500" />
              <span>Under-predict</span>
            </div>
          </div>
        )}

        {/* Mode label */}
        <div className="absolute top-3 left-3 rounded-md bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
          {viewMode === "predicted" && "Predicted Grade Model"}
          {viewMode === "actual" && "Actual Lab Results"}
          {viewMode === "variance" && "Variance Heatmap (Actual - Predicted)"}
        </div>
      </div>
    </div>
  );
}
