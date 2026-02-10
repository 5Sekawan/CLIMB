"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/climb/ui";
import { Map, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { useProjectVoxels } from "@/hooks/use-projects";
import { IMarginalZone } from "@/lib/mock-data";
import { ChartUpIcon } from "@/components/climb/icons";

// ─── Constants ───────────────────────────────────────────────
const MINERAL_GRADE_KEYS: Record<string, string> = {
    Au: 'au_grade', Cu: 'cu_grade', Ag: 'ag_grade',
    Ni: 'ni_grade', Co: 'co_grade', Fe: 'fe_grade',
    Mn: 'mn_grade', Sn: 'sn_grade', Mo: 'mo_grade',
    Zn: 'zn_grade', Cr: 'cr_grade', Ta: 'ta_grade',
};

// Classification colors
const ORE_COLOR: [number, number, number, number] = [16, 185, 129, 220];     // Green
const MARGINAL_COLOR: [number, number, number, number] = [251, 191, 36, 200]; // Amber
const WASTE_COLOR: [number, number, number, number] = [239, 68, 68, 160];     // Red
const BOUNDARY_COLOR: [number, number, number, number] = [16, 185, 129, 80];  // Green translucent

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

// ─── Deck Overlay ────────────────────────────────────────────
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

    // Parse center
    const defaultCenter = { lat: -1.523, lng: 116.842 };
    const mapCenter = useMemo(() => {
        // Prefer zone center
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

    // Fetch all voxels
    const { data: allVoxels } = useProjectVoxels(projectId);

    // Filter to zone voxels only
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

    // Build Deck.gl layers
    const deckLayers = useMemo(() => {
        const layers: any[] = [];

        // AOI polygon (dim)
        if (aoi?.geometry?.coordinates) {
            layers.push(
                new GeoJsonLayer({
                    id: 'zone-aoi',
                    data: aoi,
                    stroked: true,
                    filled: false,
                    lineWidthMinPixels: 1,
                    getLineColor: [100, 100, 100, 80],
                })
            );
        }

        // Zone boundary
        layers.push(
            new GeoJsonLayer({
                id: 'zone-boundary',
                data: { type: 'FeatureCollection', features: [zoneBoundaryGeoJSON] },
                stroked: true,
                filled: true,
                lineWidthMinPixels: 2,
                getLineColor: [16, 185, 129, 180],
                getFillColor: BOUNDARY_COLOR,
                getDashArray: [8, 4],
                dashJustified: true,
                extensions: [],
            })
        );

        // Zone voxels
        if (displayVoxels.length > 0) {
            layers.push(
                new ScatterplotLayer({
                    id: 'zone-voxels',
                    data: displayVoxels,
                    getPosition: (d: any) => [d.lon || d.x, d.lat || d.y],
                    getRadius: 35,
                    radiusMinPixels: 4,
                    radiusMaxPixels: 25,
                    getFillColor: (d: any) => {
                        switch (d.__classification) {
                            case 'ore': return ORE_COLOR;
                            case 'marginal': return MARGINAL_COLOR;
                            case 'waste': return WASTE_COLOR;
                            default: return WASTE_COLOR;
                        }
                    },
                    pickable: true,
                    opacity: opacityValue,
                    updateTriggers: {
                        getFillColor: [selectedMinerals, cogPerMineral],
                    },
                })
            );
        }

        return layers;
    }, [displayVoxels, aoi, zoneBoundaryGeoJSON, opacityValue, selectedMinerals, cogPerMineral]);

    const { stats } = zone;

    return (
        <div className={cn("relative h-full w-full", className)}>
            <Map
                mapId="marginal-zone-map"
                defaultCenter={mapCenter}
                defaultZoom={15}
                gestureHandling="greedy"
                disableDefaultUI={true}
                mapTypeId="satellite"
                className="h-full w-full"
            >
                <DeckOverlay
                    layers={deckLayers}
                    selectedMinerals={selectedMinerals}
                    cogPerMineral={cogPerMineral}
                />
            </Map>

            {/* Zone Stats Overlay (top-right) */}
            <div className="absolute right-4 top-4 w-72 space-y-2">
                <GlassPanel className="!p-0 overflow-hidden">
                    {/* Zone header */}
                    <div className="flex items-center gap-2 border-b border-white/10 bg-gradient-to-r from-emerald-500/20 to-amber-500/10 px-4 py-3">
                        <ChartUpIcon className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-white">{zone.name}</span>
                        <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                            Rank #{zone.rank}
                        </span>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-px bg-white/5">
                        <StatItem label="NPV" value={formatCurrency(stats.npv)} accent={stats.npv > 0 ? 'green' : 'red'} />
                        <StatItem label="Total Tonnage" value={formatTonnage(stats.totalTonnage)} />
                        <StatItem label="Ore Tonnage" value={formatTonnage(stats.oreTonnage)} accent="green" />
                        <StatItem label="Waste Tonnage" value={formatTonnage(stats.wasteTonnage)} accent="red" />
                        <StatItem label="Revenue" value={formatCurrency(stats.totalRevenue)} />
                        <StatItem label="Cost" value={formatCurrency(stats.totalCost)} />
                        <StatItem label="Dilution" value={`${(stats.dilutionRatio * 100).toFixed(1)}%`} accent={stats.dilutionRatio > 0.3 ? 'red' : 'green'} />
                        <StatItem label="Blocks" value={`${stats.oreCount} ore / ${stats.wasteCount + stats.marginalCount} other`} />
                    </div>

                    {/* Avg grades */}
                    <div className="border-t border-white/10 px-4 py-2">
                        <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/50">Avg Grades</div>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.avgGrades).map(([mineral, grade]) => (
                                <span key={mineral} className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80">
                                    {mineral}: {(grade as number).toFixed(4)}
                                </span>
                            ))}
                        </div>
                    </div>
                </GlassPanel>
            </div>

            {/* Depth slider (bottom-left) */}
            <div className="absolute bottom-4 left-4">
                <GlassPanel className="flex items-center gap-3 !px-4 !py-3">
                    <span className="text-xs text-white/60 font-medium min-w-[32px]">0m</span>
                    <input
                        type="range"
                        min={0}
                        max={50}
                        step={1}
                        value={localDepth}
                        onChange={(e) => setLocalDepth(Number(e.target.value))}
                        className="w-40 accent-emerald-400"
                    />
                    <span className="text-xs text-white/80 font-semibold min-w-[40px]">{localDepth}m</span>
                </GlassPanel>
            </div>

            {/* Legend (bottom-right) */}
            <div className="absolute bottom-4 right-4">
                <GlassPanel className="!px-3 !py-2">
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-3 w-3 rounded-full bg-emerald-400" />
                            <span className="text-white/70">Ore</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
                            <span className="text-white/70">Marginal</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-3 w-3 rounded-full bg-red-400" />
                            <span className="text-white/70">Waste</span>
                        </span>
                    </div>
                </GlassPanel>
            </div>

            {/* Zone voxel count badge */}
            <div className="absolute left-4 top-4">
                <GlassPanel className="!px-3 !py-2">
                    <span className="text-xs text-white/80">
                        <span className="font-semibold text-emerald-300">{displayVoxels.length}</span>
                        <span className="text-white/50"> / {zone.voxelIds.length} blocks visible</span>
                    </span>
                </GlassPanel>
            </div>
        </div>
    );
}

// ─── Stat Item ───────────────────────────────────────────────
function StatItem({
    label,
    value,
    accent,
}: {
    label: string;
    value: string;
    accent?: 'green' | 'red';
}) {
    const accentClasses = {
        green: 'text-emerald-300',
        red: 'text-red-400',
    };

    return (
        <div className="px-3 py-2 bg-white/[0.02]">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">{label}</div>
            <div className={cn("text-sm font-semibold text-white/90 mt-0.5", accent && accentClasses[accent])}>
                {value}
            </div>
        </div>
    );
}
