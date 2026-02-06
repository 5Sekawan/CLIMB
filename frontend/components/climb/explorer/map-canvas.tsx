"use client";

import { cn } from "@/lib/utils";
import { VoxelLegend } from "@/components/climb/ui";

interface MapCanvasProps {
  className?: string;
  selectedMineral: string;
  projectName: string;
  center: string;
}

export function MapCanvas({
  className,
  selectedMineral,
  projectName,
  center,
}: MapCanvasProps) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {/* Simulated 3D Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
        {/* Grid overlay simulation */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" className="text-primary/20">
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Simulated terrain contours */}
        <svg
          className="absolute inset-0 h-full w-full opacity-30"
          viewBox="0 0 800 600"
          preserveAspectRatio="none"
        >
          <path
            d="M0 400 Q100 350 200 380 Q350 330 400 360 Q500 300 600 340 Q700 310 800 350 L800 600 L0 600 Z"
            fill="hsl(160 40% 20%)"
            opacity="0.5"
          />
          <path
            d="M0 420 Q150 380 250 400 Q400 360 500 390 Q650 350 800 380 L800 600 L0 600 Z"
            fill="hsl(160 40% 15%)"
            opacity="0.5"
          />
        </svg>

        {/* Simulated Voxel Grid */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-8 grid-rows-6 gap-1 p-8 opacity-70">
            {Array.from({ length: 48 }).map((_, i) => {
              const row = Math.floor(i / 8);
              const col = i % 8;
              const dist = Math.sqrt(
                Math.pow(row - 3, 2) + Math.pow(col - 4, 2),
              );
              const grade = Math.max(0.1, 1 - dist * 0.15);
              const isHighGrade = grade > 0.6;
              const isMidGrade = grade > 0.35 && grade <= 0.6;

              return (
                <div
                  key={i}
                  className={cn(
                    "h-8 w-10 rounded-sm border transition-all duration-climb-fast cursor-crosshair",
                    "hover:scale-110 hover:z-10 hover:shadow-[0_0_12px_rgba(16,185,129,0.5)]",
                    isHighGrade && "bg-climb-mint/60 border-climb-mint/40",
                    isMidGrade &&
                      "bg-climb-marginal/40 border-climb-marginal/30",
                    !isHighGrade &&
                      !isMidGrade &&
                      "bg-climb-waste/20 border-climb-waste/15",
                  )}
                  style={{
                    opacity: Math.max(0.2, grade),
                    transform: `perspective(600px) rotateX(35deg) rotateZ(-15deg) translateY(${row * 2}px)`,
                  }}
                  title={`Block (${col}, ${row}): ${selectedMineral} ${(grade * 5).toFixed(2)} g/t`}
                />
              );
            })}
          </div>
        </div>

        {/* AOI Polygon Overlay */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 800 600"
        >
          <polygon
            points="200,150 550,130 600,350 450,430 180,380"
            fill="hsl(160 84% 39% / 0.08)"
            stroke="hsl(160 84% 39%)"
            strokeWidth="2"
            strokeDasharray="8,4"
          />
          {/* Coordinate markers */}
          {[
            [200, 150],
            [550, 130],
            [600, 350],
            [450, 430],
            [180, 380],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="hsl(160 84% 39%)"
              stroke="white"
              strokeWidth="1.5"
            />
          ))}
        </svg>

        {/* Project name badge on map */}
        <div className="absolute top-3 right-3 rounded-md bg-black/50 px-3 py-1.5 backdrop-blur-sm">
          <span className="text-xs font-semibold text-white/90">
            {projectName}
          </span>
        </div>

        {/* Coordinate info -- dynamic */}
        <div className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2.5 py-1 font-mono text-[10px] text-white/60 backdrop-blur-sm">
          {center}
          {" | Zoom: 15.4x"}
        </div>
      </div>

      {/* Voxel Legend */}
      <VoxelLegend
        mineralName={selectedMineral}
        unit="g/t"
        minValue={0.0}
        maxValue={5.0}
        className="absolute bottom-4 right-4"
      />
    </div>
  );
}
