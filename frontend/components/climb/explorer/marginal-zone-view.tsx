"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Map, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { useProjectVoxels } from "@/hooks/use-projects";
import { IMarginalZone } from "@/lib/mock-data";

// ─── Constants ───────────────────────────────────────────────
const MINERAL_GRADE_KEYS: Record<string, string> = {
    Au: 'au_grade', Cu: 'cu_grade', Ag: 'ag_grade',
    Ni: 'ni_grade', Co: 'co_grade', Fe: 'fe_grade',
    Mn: 'mn_grade', Sn: 'sn_grade', Mo: 'mo_grade',
    Zn: 'zn_grade', Cr: 'cr_grade', Ta: 'ta_grade',
};

// Classification colors — RGBA with strong alpha
const ORE_COLOR: [number, number, number, number] = [16, 185, 129, 230];
const MARGINAL_COLOR: [number, number, number, number] = [251, 191, 36, 210];
const WASTE_COLOR: [number, number, number, number] = [239, 68, 68, 180];

// ─── Types ───────────────────────────────────────────────────
interface MarginalZoneViewProps {
    className?: string;
    projectName: string;
    projectId: string;
    center: string;
    aoi?: any;
    selectedMinerals: string[];
    opacityValue: number;
    zone: IMarginalZone;
    cogPerMineral?: Record<string, number>;
}

// ─── Deck Overlay (matches CombinedView pattern exactly) ─────
function DeckOverlay({
    layers,
    selectedMinerals,
    cogPerMineral,
}: {
    layers: any[];
    selectedMinerals: string[];
    cogPerMineral?: Record<string, number>;
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
                if (object.__isZoneVoxel) {
                    const classColors: Record<string, string> = {
                        ore: '#10b981',
                        marginal: '#fbbf24',
                        waste: '#ef4444',
                    };
                    const cls = object.__classification || 'waste';
                    const clsColor = classColors[cls] || '#888';

                    const gradeLines = selectedMinerals.map(mineral => {
                        const key = MINERAL_GRADE_KEYS[mineral] || `${mineral.toLowerCase()}_grade`;
                        const grade = object[key] !== undefined ? object[key].toFixed(4) : 'N/A';
                        const cog = cogPerMineral?.[mineral];
                        const cogStr = cog !== undefined ? ` (COG: ${cog.toFixed(3)})` : '';
                        return `<div><b>${mineral}:</b> ${grade} g/t${cogStr}</div>`;
                    }).join('');

                    return {
                        html: `
                            <div style="font-family: monospace; font-size: 12px; padding: 8px; min-width: 180px;">
                                <div style="font-weight: bold; color: ${clsColor}; margin-bottom: 4px; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">
                                    ${cls}
                                </div>
                                <div style="border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 6px; padding-bottom: 4px;">
                                    ${gradeLines}
                                </div>
                                <div style="color:#aaa;">Depth: ${Math.abs(object.z || 0).toFixed(1)}m</div>
                                <div style="color:#aaa;">Net Value: <span style="color:${object.__netValue > 0 ? '#10b981' : '#ef4444'}">$${(object.__netValue || 0).toFixed(0)}</span></div>
                                <div style="color:#aaa;">Revenue: $${(object.__revenue || 0).toFixed(0)}</div>
                            </div>`,
                        style: {
                            backgroundColor: 'rgba(0,0,0,0.9)',
                            color: '#fff',
                            borderRadius: '8px',
                            border: `1px solid ${clsColor}40`,
                            zIndex: '1000',
                        },
                    };
                }
                return null;
            },
        });
    }, [overlay, layers, selectedMinerals, cogPerMineral]);

    return null;
}

// ─── Utility: classify a voxel ──────────────────────────────
function classifyVoxel(
    voxel: any,
    selectedMinerals: string[],
    cogPerMineral: Record<string, number>
): { classification: 'ore' | 'marginal' | 'waste'; netValue: number; revenue: number } {
    let isOre = false;
    let isMarginal = false;

    for (const mineral of selectedMinerals) {
        const key = MINERAL_GRADE_KEYS[mineral] || `${mineral.toLowerCase()}_grade`;
        const grade = voxel[key] || 0;
        const cog = cogPerMineral[mineral] || Infinity;

        if (grade >= cog) isOre = true;
        else if (grade >= cog * 0.85) isMarginal = true;
    }

    const classification = isOre ? 'ore' : isMarginal ? 'marginal' : 'waste';
    return { classification, netValue: 0, revenue: 0 };
}

// ─── Formatting ──────────────────────────────────────────────
function formatCurrency(val: number): string {
    if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
}

function formatTonnage(val: number): string {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}Mt`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}Kt`;
    return `${val.toFixed(0)}t`;
}

// ─── Main Component ──────────────────────────────────────────
export function MarginalZoneView({
    className,
    projectName,
    projectId,
    center,
    aoi,
    selectedMinerals,
    opacityValue,
    zone,
    cogPerMineral,
}: MarginalZoneViewProps) {
    const [localDepth, setLocalDepth] = useState(50);

    // Parse center — prefer zone center, fallback to project center (same as CombinedView)
    const defaultCenter = { lat: -1.523, lng: 116.842 };
    const mapCenter = useMemo(() => {
        if (zone.centerLat && zone.centerLon) {
            return { lat: zone.centerLat, lng: zone.centerLon };
        }
        if (!center) return defaultCenter;
        const parts = center.split(',').map(s => parseFloat(s.replace(/[^\d.-]/g, '')));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { lat: parts[0], lng: parts[1] };
        }
        return defaultCenter;
    }, [center, zone.centerLat, zone.centerLon]);

    // Fetch all project voxels (same hook as CombinedView)
    const { data: allVoxels, isLoading } = useProjectVoxels(projectId);

    // Filter to zone voxels only + apply depth filter
    const zoneVoxelIds = useMemo(() => new Set(zone.voxelIds), [zone.voxelIds]);

    const displayVoxels = useMemo(() => {
        if (!allVoxels || allVoxels.length === 0) return [];
        return (allVoxels as any[])
            .filter((v: any) => zoneVoxelIds.has(v.id) && Math.abs(v.z) <= localDepth + 0.5)
            .map((v: any) => {
                const cls = classifyVoxel(v, selectedMinerals, cogPerMineral || {});
                return {
                    ...v,
                    __isZoneVoxel: true,
                    __classification: cls.classification,
                    __netValue: cls.netValue,
                    __revenue: cls.revenue,
                };
            });
    }, [allVoxels, zoneVoxelIds, localDepth, selectedMinerals, cogPerMineral]);

    // Zone boundary GeoJSON
    const zoneBoundaryGeoJSON = useMemo(() => {
        const { minLat, maxLat, minLon, maxLon } = zone.boundingBox;
        return {
            type: 'Feature' as const,
            properties: { name: zone.name },
            geometry: {
                type: 'Polygon' as const,
                coordinates: [[
                    [minLon, minLat],
                    [maxLon, minLat],
                    [maxLon, maxLat],
                    [minLon, maxLat],
                    [minLon, minLat],
                ]],
            },
        };
    }, [zone]);

    // Build Deck.gl layers — following CombinedView pattern exactly
    const deckLayers = useMemo(() => {
        const layers: any[] = [];

        // AOI polygon (dim outline, same check as CombinedView)
        if (aoi) {
            layers.push(
                new GeoJsonLayer({
                    id: 'zone-aoi',
                    data: aoi,
                    stroked: true,
                    filled: false,
                    lineWidthMinPixels: 1,
                    getLineColor: [100, 100, 100, 100],
                })
            );
        }

        // Zone boundary (bright green dashed)
        layers.push(
            new GeoJsonLayer({
                id: 'zone-boundary',
                data: { type: 'FeatureCollection', features: [zoneBoundaryGeoJSON] },
                stroked: true,
                filled: true,
                lineWidthMinPixels: 2,
                getLineColor: [16, 185, 129, 200],
                getFillColor: [16, 185, 129, 25],
            })
        );

        // Zone voxels — using SAME position accessor as CombinedView: [d.x, d.y]
        // Because spatialGridService stores lon in .x and lat in .y
        if (displayVoxels.length > 0) {
            layers.push(
                new ScatterplotLayer({
                    id: 'zone-voxels',
                    data: displayVoxels,
                    pickable: true,
                    getPosition: (d: any) => [d.x, d.y],  // Same as CombinedView
                    getFillColor: (d: any) => {
                        switch (d.__classification) {
                            case 'ore': return ORE_COLOR;
                            case 'marginal': return MARGINAL_COLOR;
                            case 'waste': return WASTE_COLOR;
                            default: return WASTE_COLOR;
                        }
                    },
                    getRadius: 60,           // Same as CombinedView
                    radiusMinPixels: 8,      // Same as CombinedView
                    radiusMaxPixels: 35,     // Same as CombinedView
                    stroked: false,
                    updateTriggers: {
                        getFillColor: [selectedMinerals, cogPerMineral, opacityValue],
                    },
                })
            );
        }

        return layers;
    }, [displayVoxels, aoi, zoneBoundaryGeoJSON, opacityValue, selectedMinerals, cogPerMineral]);

    const { stats } = zone;

    return (
        <div className={cn("relative h-full w-full overflow-hidden", className)}>
            {/* Map — matching CombinedView props exactly */}
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
                <DeckOverlay
                    layers={deckLayers}
                    selectedMinerals={selectedMinerals}
                    cogPerMineral={cogPerMineral}
                />
            </Map>

            {/* ─── Project Info Overlay (top-left) ─────────── */}
            <div className="absolute top-3 left-3 rounded-md bg-black/60 px-3 py-1.5 backdrop-blur-sm pointer-events-none z-10">
                <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                    {projectName} •&nbsp;
                </span>
                <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                    {zone.name}
                </span>
            </div>

            {/* ─── Zone Stats Panel (top-right, high contrast) ── */}
            <div className="absolute right-3 top-3 z-20 pointer-events-auto">
                <div className="rounded-xl bg-black/80 border border-white/10 backdrop-blur-md shadow-2xl w-72 overflow-hidden">
                    {/* Zone Header */}
                    <div className="flex items-center gap-2 border-b border-white/10 bg-emerald-500/15 px-4 py-2.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-sm font-bold text-white">{zone.name}</span>
                        <span className="ml-auto rounded-full bg-emerald-500/25 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            RANK #{zone.rank}
                        </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-px bg-white/5">
                        <StatCell label="NPV" value={formatCurrency(stats.npv)} accent={stats.npv > 0 ? 'green' : 'red'} />
                        <StatCell label="Total Tonnage" value={formatTonnage(stats.totalTonnage)} />
                        <StatCell label="Ore Tonnage" value={formatTonnage(stats.oreTonnage)} accent="green" />
                        <StatCell label="Waste Tonnage" value={formatTonnage(stats.wasteTonnage)} accent="red" />
                        <StatCell label="Revenue" value={formatCurrency(stats.totalRevenue)} accent="green" />
                        <StatCell label="Cost" value={formatCurrency(stats.totalCost)} />
                        <StatCell label="Dilution" value={`${(stats.dilutionRatio * 100).toFixed(1)}%`} accent={stats.dilutionRatio > 0.3 ? 'red' : 'green'} />
                        <StatCell label="Blocks" value={`${stats.oreCount} ore / ${stats.wasteCount + stats.marginalCount} other`} />
                    </div>

                    {/* Avg Grades */}
                    <div className="border-t border-white/10 px-4 py-2.5">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50">Avg Grades</div>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.entries(stats.avgGrades).map(([mineral, grade]) => (
                                <span key={mineral} className="rounded bg-white/10 border border-white/5 px-2 py-0.5 text-[11px] font-mono text-white/90">
                                    {mineral}: {(grade as number).toFixed(4)}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Depth Control + Legend (bottom-left, same style as CombinedView) */}
            <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
                <div className="rounded-xl bg-black/70 border border-white/10 backdrop-blur-md px-4 py-3 shadow-xl min-w-[260px]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
                            Zone Depth
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-400">
                            {localDepth}m
                        </span>
                    </div>

                    {/* Slider */}
                    <input
                        type="range"
                        min={0}
                        max={50}
                        step={1}
                        value={localDepth}
                        onChange={(e) => setLocalDepth(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400
                            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
                            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/30
                            bg-gradient-to-r from-white/20 to-white/40"
                    />

                    <div className="flex justify-between mt-1 text-[9px] text-white/40 font-mono">
                        <span>0m</span>
                        <span>50m</span>
                    </div>

                    {/* Voxel count info */}
                    <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-white/50">
                        {isLoading ? (
                            <span className="text-emerald-400 animate-pulse">Loading voxels…</span>
                        ) : (
                            <span>
                                <span className="font-bold text-emerald-300">{displayVoxels.length}</span>
                                <span> / {zone.voxelIds.length} zone blocks visible</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Legend (bottom-right) ──────────────────── */}
            <div className="absolute bottom-4 right-4 z-10 pointer-events-auto">
                <div className="rounded-xl bg-black/70 border border-white/10 backdrop-blur-md px-3 py-2.5 shadow-xl">
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                            <span className="text-white/80 font-medium">Ore</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                            <span className="text-white/80 font-medium">Marginal</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-3 w-3 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                            <span className="text-white/80 font-medium">Waste</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Coordinates */}
            <div className="absolute bottom-3 left-[300px] rounded-md bg-black/50 px-2.5 py-1 font-mono text-[10px] text-white/60 backdrop-blur-sm pointer-events-none z-10">
                {center}
            </div>
        </div>
    );
}

// ─── Stat Cell (high-contrast dark theme) ────────────────────
function StatCell({
    label,
    value,
    accent,
}: {
    label: string;
    value: string;
    accent?: 'green' | 'red';
}) {
    const accentClass = accent === 'green'
        ? 'text-emerald-400'
        : accent === 'red'
            ? 'text-red-400'
            : 'text-white/90';

    return (
        <div className="px-3 py-2.5 bg-black/30">
            <div className="text-[9px] text-white/50 uppercase tracking-wider font-semibold">{label}</div>
            <div className={cn("text-sm font-bold mt-0.5", accentClass)}>
                {value}
            </div>
        </div>
    );
}
