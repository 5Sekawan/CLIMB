"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { VoxelLegend } from "@/components/climb/ui";
import { Map, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { useProjectVoxels } from "@/hooks/use-projects";

// ─── Constants ───────────────────────────────────────────────
const MINERAL_GRADE_KEYS: Record<string, string> = {
    Au: 'au_grade', Cu: 'cu_grade', Ag: 'ag_grade',
    Ni: 'ni_grade', Co: 'co_grade', Fe: 'fe_grade',
    Mn: 'mn_grade', Sn: 'sn_grade', Mo: 'mo_grade',
    Zn: 'zn_grade', Cr: 'cr_grade', Ta: 'ta_grade',
};

// ─── Types ───────────────────────────────────────────────────
interface CombinedViewProps {
    className?: string;
    projectName: string;
    projectId: string;
    center: string;
    aoi?: any;
    selectedMinerals: string[];
    opacityValue: number;
}

// ─── Deck Overlay ────────────────────────────────────────────
function DeckOverlay({
    layers,
    selectedMinerals,
}: {
    layers: any[];
    selectedMinerals: string[];
}) {
    const map = useMap();
    const overlay = useMemo(() => new GoogleMapsOverlay({ layers: [] }), []);

    useEffect(() => {
        if (map) overlay.setMap(map);
        return () => { overlay.setMap(null); };
    }, [map, overlay]);

    useEffect(() => {
        overlay.setProps({
            layers,
            getTooltip: ({ object }: any) => {
                if (!object) return null;
                if (object.__isVoxel) {
                    const gradeLines = selectedMinerals.map(mineral => {
                        const key = MINERAL_GRADE_KEYS[mineral] || `${mineral.toLowerCase()}_grade`;
                        const grade = object[key] !== undefined ? object[key].toFixed(3) : 'N/A';
                        return `<div><b>${mineral}:</b> ${grade} g/t</div>`;
                    }).join('');

                    return {
                        html: `
                            <div style="font-family: monospace; font-size: 12px; padding: 6px;">
                                <div style="font-weight: bold; color: #10b981; margin-bottom: 4px;">
                                    Voxel ${object.id || ''}
                                </div>
                                ${gradeLines}
                                <div style="color:#888;margin-top:4px;">Depth: ${Math.abs(object.z || 0).toFixed(1)}m</div>
                                ${object.__isCumulative ? `<div style="color:#fbbf24;font-size:10px;">Cumulative avg (${object.__layerCount} layers)</div>` : ''}
                            </div>`,
                        style: {
                            backgroundColor: 'rgba(0,0,0,0.85)',
                            color: '#fff',
                            borderRadius: '6px',
                            zIndex: '1000',
                        },
                    };
                }
                return null;
            },
        });
    }, [overlay, layers, selectedMinerals]);

    return null;
}

// ─── Grade → Color ───────────────────────────────────────────
function gradeToColor(grade: number, opacity: number): [number, number, number, number] {
    const n = Math.min(Math.max(grade, 0), 5) / 5;
    return [
        Math.round(255 * n),
        Math.round(255 * (1 - Math.abs(0.5 - n) * 2)),
        Math.round(255 * (1 - n)),
        Math.round(255 * opacity),
    ];
}

function getMaxGrade(voxel: any, selectedMinerals: string[]): number {
    let max = 0;
    selectedMinerals.forEach(mineral => {
        const key = MINERAL_GRADE_KEYS[mineral] || `${mineral.toLowerCase()}_grade`;
        const grade = voxel[key] || 0;
        if (grade > max) max = grade;
    });
    return max;
}

// ─── Main Component ──────────────────────────────────────────
export function CombinedView({
    className,
    projectName,
    projectId,
    center,
    aoi,
    selectedMinerals,
    opacityValue,
}: CombinedViewProps) {
    // Local state for depth slider + cumulative toggle
    const [localDepth, setLocalDepth] = useState(5);
    const [isCumulative, setIsCumulative] = useState(false);

    // Parse center
    const defaultCenter = { lat: -1.523, lng: 116.842 };
    const mapCenter = useMemo(() => {
        if (!center) return defaultCenter;
        const parts = center.split(',').map(s => parseFloat(s.replace(/[^\d.-]/g, '')));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { lat: parts[0], lng: parts[1] };
        }
        return defaultCenter;
    }, [center]);

    // Fetch voxels
    const { data: voxels, isLoading } = useProjectVoxels(projectId);

    // Compute unique depths for slider max
    const depthRange = useMemo(() => {
        if (!voxels || voxels.length === 0) return { min: 0, max: 50, steps: [] };
        const depths = [...new Set(voxels.map((v: any) => Math.abs(v.z)))].sort((a, b) => a - b);
        return { min: 0, max: Math.ceil(depths[depths.length - 1] || 50), steps: depths };
    }, [voxels]);

    // Filter/aggregate voxels based on depth + cumulative mode
    const displayVoxels = useMemo(() => {
        if (!voxels || voxels.length === 0) return [];

        if (!isCumulative) {
            // Non-cumulative: closest depth layer to selected value
            const absDepths = [...new Set(voxels.map((v: any) => Math.abs(v.z)))].sort((a, b) => a - b);
            // Find closest depth <= localDepth
            const targetDepth = absDepths.filter(d => d <= localDepth).pop() ?? absDepths[0] ?? 0;
            return voxels
                .filter((v: any) => Math.abs(Math.abs(v.z) - targetDepth) < 0.5)
                .map((v: any) => ({ ...v, __isVoxel: true, __isCumulative: false }));
        } else {
            // Cumulative: aggregate all voxels from 0 to localDepth by (x,y) position
            const filtered = voxels.filter((v: any) => Math.abs(v.z) <= localDepth + 0.5);
            const grouped: Record<string, any> = {};

            filtered.forEach((v: any) => {
                const key = `${v.x.toFixed(6)}_${v.y.toFixed(6)}`;
                if (!grouped[key]) {
                    grouped[key] = { ...v, __count: 1, __isVoxel: true, __isCumulative: true };
                } else {
                    const g = grouped[key];
                    // Running average for each mineral grade
                    Object.values(MINERAL_GRADE_KEYS).forEach(gradeKey => {
                        const existing = g[gradeKey] || 0;
                        const incoming = v[gradeKey] || 0;
                        g[gradeKey] = (existing * g.__count + incoming) / (g.__count + 1);
                    });
                    g.__count++;
                }
            });

            return Object.values(grouped).map((v: any) => ({
                ...v,
                __layerCount: v.__count,
            }));
        }
    }, [voxels, localDepth, isCumulative]);

    // Build layers
    const layers = useMemo(() => {
        const deckLayers: any[] = [];

        // AOI Polygon
        if (aoi) {
            deckLayers.push(
                new GeoJsonLayer({
                    id: 'combined-aoi',
                    data: aoi,
                    stroked: true,
                    filled: true,
                    lineWidthMinPixels: 2,
                    getLineColor: [16, 185, 129, 220],
                    getFillColor: [16, 185, 129, 15],
                })
            );
        }

        // Voxel heatmap points
        if (displayVoxels.length > 0) {
            deckLayers.push(
                new ScatterplotLayer({
                    id: 'combined-voxels',
                    data: displayVoxels,
                    pickable: true,
                    getPosition: (d: any) => [d.x, d.y],
                    getFillColor: (d: any) => gradeToColor(getMaxGrade(d, selectedMinerals), opacityValue),
                    getRadius: 60,
                    radiusMinPixels: 8,
                    radiusMaxPixels: 35,
                    stroked: false,
                    updateTriggers: {
                        getFillColor: [selectedMinerals, opacityValue],
                    },
                })
            );
        }

        return deckLayers;
    }, [aoi, displayVoxels, selectedMinerals, opacityValue]);

    return (
        <div className={cn("relative h-full w-full overflow-hidden", className)}>
            <Map
                defaultCenter={mapCenter}
                defaultZoom={15}
                center={mapCenter}
                mapId="climb-map-satellite"
                disableDefaultUI={true}
                gestureHandling={'greedy'}
                className="h-full w-full"
                mapTypeId="satellite"
                tilt={0}
                heading={0}
            >
                <DeckOverlay layers={layers} selectedMinerals={selectedMinerals} />
            </Map>

            {/* ─── Project Info Overlay ────────────────────── */}
            <div className="absolute top-3 right-3 rounded-md bg-black/50 px-3 py-1.5 backdrop-blur-sm pointer-events-none z-10">
                <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                    {projectName} • Combined View
                </span>
            </div>

            {/* ─── On-Map Depth Controls ──────────────────── */}
            <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
                <div className="rounded-xl bg-black/70 border border-white/10 backdrop-blur-md px-4 py-3 shadow-xl min-w-[240px]">
                    {/* Cumulative Toggle */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
                            Depth Control
                        </span>
                        <button
                            onClick={() => setIsCumulative(!isCumulative)}
                            className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
                                isCumulative ? "bg-climb-mint" : "bg-white/20"
                            )}
                        >
                            <span
                                className={cn(
                                    "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                                    isCumulative ? "translate-x-6" : "translate-x-1"
                                )}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-white/50">
                            {isCumulative ? 'Cumulative (0 → depth)' : 'Single Layer'}
                        </span>
                        <span className="font-mono text-xs font-bold text-climb-mint">
                            {localDepth}m
                        </span>
                    </div>

                    {/* Depth Slider */}
                    <input
                        type="range"
                        min={0}
                        max={depthRange.max}
                        step={1}
                        value={localDepth}
                        onChange={(e) => setLocalDepth(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-climb-mint
                            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
                            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/30
                            bg-gradient-to-r from-white/20 to-white/40"
                    />

                    <div className="flex justify-between mt-1 text-[9px] text-white/40 font-mono">
                        <span>0m</span>
                        <span>{depthRange.max}m</span>
                    </div>

                    {/* Info */}
                    <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-white/50">
                        {isLoading ? (
                            <span className="text-climb-mint animate-pulse">Loading voxels…</span>
                        ) : (
                            <span>{displayVoxels.length.toLocaleString()} voxels displayed</span>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Legend ─────────────────────────────────── */}
            {displayVoxels.length > 0 && (
                <VoxelLegend
                    mineralName={selectedMinerals.join(', ')}
                    unit="g/t"
                    minValue={0.0}
                    maxValue={5.0}
                    className="absolute bottom-4 right-4 pointer-events-auto z-10 animate-fade-in-up"
                />
            )}

            {/* Coordinates */}
            <div className="absolute bottom-3 left-[280px] rounded-md bg-black/50 px-2.5 py-1 font-mono text-[10px] text-white/60 backdrop-blur-sm pointer-events-none z-10">
                {center}
            </div>
        </div>
    );
}
