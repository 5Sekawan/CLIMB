"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { VoxelLegend } from "@/components/climb/ui";
import DeckGL from '@deck.gl/react';
import { OrbitView } from '@deck.gl/core';
import { PointCloudLayer } from '@deck.gl/layers';
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

// --- Initial View State ---
const INITIAL_VIEW_STATE = {
    target: [0, 0, 0] as [number, number, number],
    rotationX: 45,
    rotationOrbit: 0,
    zoom: 3,
    minZoom: -2,
    maxZoom: 10,
};

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

    // Process voxels for 3D rendering
    const processedVoxels = useMemo(() => {
        if (!voxels || voxels.length === 0) return [];

        // Filter by depth
        const filtered = voxels.filter((v: any) => Math.abs(v.z) <= depthValue);

        // Calculate bounds for centering
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        filtered.forEach((v: any) => {
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y);
            maxY = Math.max(maxY, v.y);
            minZ = Math.min(minZ, v.z);
            maxZ = Math.max(maxZ, v.z);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        // Normalize positions relative to center and scale for visibility
        const scale = 100; // Scale factor for better visibility
        return filtered.map((v: any) => ({
            ...v,
            position: [
                (v.x - centerX) * scale,
                (v.y - centerY) * scale,
                (v.z - centerZ) * scale * 5, // Exaggerate Z for depth visibility
            ],
            originalX: v.x,
            originalY: v.y,
        }));
    }, [voxels, depthValue]);

    // Construct Deck.gl layers
    const layers = useMemo(() => {
        if (processedVoxels.length === 0) return [];

        return [
            new PointCloudLayer({
                id: 'voxel-layer',
                data: processedVoxels,
                pickable: true,
                getPosition: (d: any) => d.position,
                getNormal: [0, 0, 1],
                getColor: (d: any) => {
                    // Find highest grade among selected minerals
                    let maxGrade = 0;
                    selectedMinerals.forEach(mineral => {
                        const key = MINERAL_GRADE_KEYS[mineral] || `${mineral.toLowerCase()}_grade`;
                        const grade = d[key] || 0;
                        if (grade > maxGrade) {
                            maxGrade = grade;
                        }
                    });

                    // Normalize grade (0-5 scale to 0-1)
                    const n = Math.min(Math.max(maxGrade, 0), 5) / 5;

                    // Color gradient: Blue (cold) → Green (mid) → Red (hot)
                    return [
                        Math.round(255 * n),                          // R
                        Math.round(255 * (1 - Math.abs(0.5 - n) * 2)), // G
                        Math.round(255 * (1 - n)),                    // B
                        Math.round(255 * opacityValue),               // A
                    ];
                },
                pointSize: 12,
                material: {
                    ambient: 0.5,
                    diffuse: 0.6,
                    shininess: 100,
                },
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
    }, [processedVoxels, selectedMinerals, opacityValue]);

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
                <div className="rounded-lg bg-slate-900/95 border border-slate-700 px-3 py-2 shadow-xl backdrop-blur-sm min-w-[180px]">
                    {/* Header */}
                    <div className="text-xs font-bold text-climb-mint border-b border-slate-700 pb-1 mb-2">
                        Voxel {object.id || 'Unknown'}
                    </div>

                    {/* Mineral Grades */}
                    <div className="space-y-1 text-xs mb-2">
                        {gradeLines}
                    </div>

                    {/* Depth & Coordinates */}
                    <div className="border-t border-slate-700 pt-2 text-[10px] text-slate-400 space-y-0.5">
                        <div className="flex justify-between">
                            <span>Depth:</span>
                            <span className="font-mono">{object.z?.toFixed(1)}m</span>
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
                views={new OrbitView({ id: 'orbit' })}
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
                {processedVoxels.length.toLocaleString()} voxels • Depth ≤ {depthValue}m
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
