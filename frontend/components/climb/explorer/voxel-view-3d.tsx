"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { VoxelLegend } from "@/components/climb/ui";
import DeckGL from '@deck.gl/react';
import { OrbitView, LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';
import { useProjectVoxels } from "@/hooks/use-projects";

// --- Mineral Grade Keys ---
const MINERAL_GRADE_KEYS: Record<string, string> = {
    Au: 'au_grade',
    Cu: 'cu_grade',
    Ag: 'ag_grade',
    Ni: 'ni_grade',
    Co: 'co_grade',
    Fe: 'fe_grade',
    Mn: 'mn_grade',
    Sn: 'sn_grade',
    Mo: 'mo_grade',
    Zn: 'zn_grade',
    Cr: 'cr_grade',
    Ta: 'ta_grade',
};

// --- Types ---
interface VoxelView3DProps {
    className?: string;
    projectName: string;
    projectId: string;
    selectedMinerals: string[];
    depthValue: number;
    opacityValue: number;
}

interface TooltipInfo {
    x: number;
    y: number;
    object: any;
}

interface GridVoxel {
    id: string;
    gridX: number;
    gridY: number;
    gridZ: number;
    position: [number, number, number];
    color: [number, number, number, number];
    originalX: number;
    originalY: number;
    originalZ: number;
    [key: string]: any;
}

// --- Constants ---
const SPHERE_RADIUS = 8;  // Pixel radius for scatterplot points
const GRID_SPACING = 25;  // Spacing between voxel centers in world units
const DEPTH_SCALE = 1.5;  // Exaggerate depth for better visibility

// --- Initial View State ---
const INITIAL_VIEW_STATE = {
    target: [0, 0, 0] as [number, number, number],
    rotationX: 45,
    rotationOrbit: -30,
    zoom: 2,
    minZoom: -2,
    maxZoom: 10,
};

// --- Lighting Setup ---
const ambientLight = new AmbientLight({
    color: [255, 255, 255],
    intensity: 0.6,
});

const directionalLight1 = new DirectionalLight({
    color: [255, 255, 255],
    intensity: 0.8,
    direction: [-1, -2, -3],
});

const directionalLight2 = new DirectionalLight({
    color: [200, 200, 255],
    intensity: 0.3,
    direction: [1, 1, 1],
});

const lightingEffect = new LightingEffect({
    ambientLight,
    directionalLight1,
    directionalLight2,
});

export function VoxelView3D({
    className,
    projectName,
    projectId,
    selectedMinerals,
    depthValue,
    opacityValue,
}: VoxelView3DProps) {
    // State for tooltip
    const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

    // Fetch voxel data
    const { data: voxels, isLoading, isError } = useProjectVoxels(projectId);

    // Transform voxels to uniform 3D grid
    const { gridVoxels, gridDimensions } = useMemo(() => {
        if (!voxels || voxels.length === 0) {
            return { gridVoxels: [], gridDimensions: { x: 0, y: 0, z: 0 } };
        }

        // Filter by depth
        const filtered = voxels.filter((v: any) => Math.abs(v.z) <= depthValue);

        if (filtered.length === 0) {
            return { gridVoxels: [], gridDimensions: { x: 0, y: 0, z: 0 } };
        }

        // Step 1: Extract unique X (lon), Y (lat), and Z (depth) values
        const uniqueXSet = new Set<string>();
        const uniqueYSet = new Set<string>();
        const uniqueZSet = new Set<string>();

        filtered.forEach((v: any) => {
            uniqueXSet.add(v.x.toFixed(6));
            uniqueYSet.add(v.y.toFixed(6));
            uniqueZSet.add(v.z.toFixed(1));
        });

        // Step 2: Sort and create index mappings
        const uniqueXs = Array.from(uniqueXSet).sort((a, b) => parseFloat(a) - parseFloat(b));
        const uniqueYs = Array.from(uniqueYSet).sort((a, b) => parseFloat(a) - parseFloat(b));
        const uniqueZs = Array.from(uniqueZSet).sort((a, b) => parseFloat(a) - parseFloat(b));

        const xIndex = new Map(uniqueXs.map((x, i) => [x, i]));
        const yIndex = new Map(uniqueYs.map((y, i) => [y, i]));
        const zIndex = new Map(uniqueZs.map((z, i) => [z, i]));

        // Step 3: Calculate grid center for centering the view
        const gridWidth = uniqueXs.length;
        const gridHeight = uniqueYs.length;
        const gridDepth = uniqueZs.length;

        const centerX = ((gridWidth - 1) * GRID_SPACING) / 2;
        const centerY = ((gridHeight - 1) * GRID_SPACING) / 2;
        const centerZ = ((gridDepth - 1) * GRID_SPACING * DEPTH_SCALE) / 2;

        // Step 4: Transform each voxel to grid coordinates
        const transformed: GridVoxel[] = filtered.map((v: any) => {
            const gx = xIndex.get(v.x.toFixed(6)) ?? 0;
            const gy = yIndex.get(v.y.toFixed(6)) ?? 0;
            const gz = zIndex.get(v.z.toFixed(1)) ?? 0;

            // Find highest grade among selected minerals for coloring
            let maxGrade = 0;
            selectedMinerals.forEach(mineral => {
                const key = MINERAL_GRADE_KEYS[mineral] || `${mineral.toLowerCase()}_grade`;
                const grade = v[key] || 0;
                if (grade > maxGrade) {
                    maxGrade = grade;
                }
            });

            // Normalize grade (0-5 scale to 0-1)
            const n = Math.min(Math.max(maxGrade, 0), 5) / 5;

            // Color gradient: Blue (cold) → Green (mid) → Red (hot)
            const color: [number, number, number, number] = [
                Math.round(255 * n),                          // R
                Math.round(255 * (1 - Math.abs(0.5 - n) * 2)), // G
                Math.round(255 * (1 - n)),                    // B
                Math.round(255 * opacityValue),               // A
            ];

            return {
                ...v,
                id: v.id,
                gridX: gx,
                gridY: gy,
                gridZ: gz,
                position: [
                    gx * GRID_SPACING - centerX,
                    gy * GRID_SPACING - centerY,
                    -gz * GRID_SPACING * DEPTH_SCALE + centerZ, // Negative Z so depth goes "down"
                ] as [number, number, number],
                color,
                originalX: v.x,
                originalY: v.y,
                originalZ: v.z,
            };
        });

        return {
            gridVoxels: transformed,
            gridDimensions: { x: gridWidth, y: gridHeight, z: gridDepth },
        };
    }, [voxels, depthValue, selectedMinerals, opacityValue]);

    // Construct Deck.gl layers
    const layers = useMemo(() => {
        if (gridVoxels.length === 0) return [];

        return [
            new ScatterplotLayer({
                id: 'voxel-sphere-layer',
                data: gridVoxels,
                pickable: true,
                stroked: true,
                filled: true,
                radiusUnits: 'pixels',
                lineWidthUnits: 'pixels',
                getPosition: (d: GridVoxel) => d.position,
                getFillColor: (d: GridVoxel) => d.color,
                getLineColor: (d: GridVoxel) => [
                    Math.min(255, d.color[0] + 40),
                    Math.min(255, d.color[1] + 40),
                    Math.min(255, d.color[2] + 40),
                    255
                ],
                getRadius: SPHERE_RADIUS,
                lineWidthMinPixels: 1,
                lineWidthMaxPixels: 2,
                antialiasing: true,
                onHover: (info: any) => {
                    if (info.object) {
                        setTooltip({
                            x: info.x,
                            y: info.y,
                            object: info.object,
                        });
                    } else {
                        setTooltip(null);
                    }
                },
            }),
        ];
    }, [gridVoxels]);

    // Tooltip content renderer
    const renderTooltip = useCallback(() => {
        if (!tooltip) return null;

        const { x, y, object } = tooltip;

        // Build mineral grades string
        const gradeLines = selectedMinerals.map(mineral => {
            const key = MINERAL_GRADE_KEYS[mineral] || `${mineral.toLowerCase()}_grade`;
            const grade = object[key] !== undefined ? object[key].toFixed(2) : 'N/A';
            return (
                <div key={mineral} className="flex justify-between gap-4">
                    <span className="text-white/70">{mineral}:</span>
                    <span className="font-bold text-white">{grade} g/t</span>
                </div>
            );
        });

        return (
            <div
                className="absolute z-50 pointer-events-none"
                style={{ left: x + 10, top: y + 10 }}
            >
                <div className="rounded-lg bg-slate-900/95 border border-slate-700 px-3 py-2 shadow-xl backdrop-blur-sm min-w-[200px]">
                    {/* Header */}
                    <div className="text-xs font-bold text-climb-mint border-b border-slate-700 pb-1 mb-2">
                        Voxel {object.id || 'Unknown'}
                    </div>

                    {/* Grid Position */}
                    <div className="text-[10px] text-slate-400 mb-2 font-mono">
                        Grid: [{object.gridX}, {object.gridY}, {object.gridZ}]
                    </div>

                    {/* Mineral Grades */}
                    <div className="space-y-1 text-xs mb-2">
                        {gradeLines}
                    </div>

                    {/* Original Depth & Coordinates */}
                    <div className="border-t border-slate-700 pt-2 text-[10px] text-slate-400 space-y-0.5">
                        <div className="flex justify-between">
                            <span>Depth:</span>
                            <span className="font-mono">{object.originalZ?.toFixed(1)}m</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Coords:</span>
                            <span className="font-mono">
                                {object.originalX?.toFixed(4)}, {object.originalY?.toFixed(4)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }, [tooltip, selectedMinerals]);

    // Loading state
    if (isLoading) {
        return (
            <div className={cn("relative h-full w-full bg-slate-950 flex items-center justify-center", className)}>
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-climb-mint" />
                    <p className="text-sm text-white/60">Loading voxel data...</p>
                </div>
            </div>
        );
    }

    // No data state
    if (!voxels || voxels.length === 0) {
        return (
            <div className={cn("relative h-full w-full bg-slate-950 flex items-center justify-center", className)}>
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center">
                        <svg className="h-8 w-8 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-base font-medium text-white">No Voxel Model</p>
                        <p className="text-sm text-white/50 mt-1">Run AI Inference to generate 3D model</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("relative h-full w-full bg-slate-950 overflow-hidden", className)}>
            {/* Deck.gl 3D Canvas */}
            <DeckGL
                views={new OrbitView({ id: 'orbit', orbitAxis: 'Z' })}
                initialViewState={INITIAL_VIEW_STATE}
                controller={{
                    scrollZoom: true,
                    dragPan: true,
                    dragRotate: true,
                    doubleClickZoom: true,
                    touchZoom: true,
                    touchRotate: true,
                    keyboard: true,
                }}
                layers={layers}
                effects={[lightingEffect]}
                style={{ width: '100%', height: '100%' }}
            />

            {/* Tooltip */}
            {renderTooltip()}

            {/* Project Info Overlay */}
            <div className="absolute top-3 right-3 rounded-md bg-black/60 px-3 py-1.5 backdrop-blur-sm pointer-events-none z-10">
                <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                    {projectName} • 3D Voxel Model
                </span>
            </div>

            {/* Controls Help */}
            <div className="absolute top-3 left-3 rounded-md bg-black/60 px-3 py-2 backdrop-blur-sm pointer-events-none z-10">
                <div className="text-[10px] text-white/60 space-y-0.5">
                    <div><span className="text-white/80">Rotate:</span> Left-click + drag</div>
                    <div><span className="text-white/80">Zoom:</span> Scroll wheel</div>
                    <div><span className="text-white/80">Pan:</span> Right-click + drag</div>
                </div>
            </div>

            {/* Stats */}
            <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2.5 py-1 font-mono text-[10px] text-white/60 backdrop-blur-sm pointer-events-none z-10">
                {gridVoxels.length.toLocaleString()} voxels • Grid {gridDimensions.x}×{gridDimensions.y}×{gridDimensions.z} • Depth ≤ {depthValue}m
            </div>

            {/* Legend */}
            <VoxelLegend
                mineralName={selectedMinerals.join(', ')}
                unit="g/t"
                minValue={0.0}
                maxValue={5.0}
                className="absolute bottom-4 right-4 pointer-events-auto z-10"
            />
        </div>
    );
}
