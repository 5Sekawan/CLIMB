"use client";

import React, { useMemo, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Map, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { GeoJsonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';

// ─── Types ───────────────────────────────────────────────────
interface NearestDeposit {
    name: string;
    distance: string;
    grade: string;
    source: string;
    lat?: number;
    lng?: number;
}

interface SatelliteViewProps {
    className?: string;
    projectName: string;
    center: string;
    aoi?: any; // GeoJSON Polygon
    nearestDeposits?: NearestDeposit[];
}

// ─── DeckGL Overlay ──────────────────────────────────────────
function DeckOverlay({ layers, visible }: { layers: any[]; visible: boolean }) {
    const map = useMap();
    const overlay = useMemo(() => new GoogleMapsOverlay({ layers: [] }), []);

    useEffect(() => {
        if (map) overlay.setMap(map);
        return () => { overlay.setMap(null); };
    }, [map, overlay]);

    useEffect(() => {
        if (!visible) {
            overlay.setProps({ layers: [] });
            return;
        }
        overlay.setProps({
            layers,
            getTooltip: ({ object }: any) => {
                if (!object) return null;
                if (object.__isDeposit) {
                    return {
                        html: `
                            <div style="font-family: monospace; font-size: 12px; padding: 6px;">
                                <div style="font-weight: bold; color: #10b981; margin-bottom: 4px;">${object.name}</div>
                                <div>Distance: ${object.distance}</div>
                                <div>Grade: ${object.grade}</div>
                                <div style="color: #888; font-size: 10px;">${object.source}</div>
                            </div>`,
                        style: {
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            color: '#fff',
                            borderRadius: '6px',
                            zIndex: '1000',
                        },
                    };
                }
                return null;
            },
        });
    }, [overlay, layers, visible]);

    return null;
}

// ─── Main Component ──────────────────────────────────────────
export function SatelliteView({
    className,
    projectName,
    center,
    aoi,
    nearestDeposits,
}: SatelliteViewProps) {
    const defaultCenter = { lat: -1.523, lng: 116.842 };
    const mapCenter = useMemo(() => {
        if (!center) return defaultCenter;
        const parts = center.split(',').map(s => parseFloat(s.replace(/[^\d.-]/g, '')));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { lat: parts[0], lng: parts[1] };
        }
        return defaultCenter;
    }, [center]);

    // Build deposit data with coords derived from AOI center + offset
    const depositPoints = useMemo(() => {
        if (!nearestDeposits || nearestDeposits.length === 0) return [];

        return nearestDeposits.map((dep, i) => {
            // If deposit has explicit lat/lng, use those
            if (dep.lat && dep.lng) {
                return { ...dep, position: [dep.lng, dep.lat], __isDeposit: true };
            }
            // Otherwise, generate radial positions around center
            const angle = (i / nearestDeposits.length) * 2 * Math.PI;
            const radiusKm = parseFloat(dep.distance) || (5 + i * 3);
            const radiusDeg = radiusKm / 111; // ~111km per degree
            return {
                ...dep,
                position: [
                    mapCenter.lng + radiusDeg * Math.cos(angle),
                    mapCenter.lat + radiusDeg * Math.sin(angle),
                ],
                __isDeposit: true,
            };
        });
    }, [nearestDeposits, mapCenter]);

    // Construct DeckGL layers
    const layers = useMemo(() => {
        const deckLayers: any[] = [];

        // AOI Polygon
        if (aoi) {
            deckLayers.push(
                new GeoJsonLayer({
                    id: 'satellite-aoi-layer',
                    data: aoi,
                    stroked: true,
                    filled: true,
                    lineWidthMinPixels: 2,
                    getLineColor: [16, 185, 129, 220],  // climb-mint
                    getFillColor: [16, 185, 129, 30],
                })
            );
        }

        // Deposit markers
        if (depositPoints.length > 0) {
            deckLayers.push(
                new ScatterplotLayer({
                    id: 'deposit-markers',
                    data: depositPoints,
                    pickable: true,
                    getPosition: (d: any) => d.position,
                    getFillColor: [251, 191, 36, 200],  // amber
                    getLineColor: [255, 255, 255, 180],
                    getRadius: 120,
                    radiusMinPixels: 6,
                    radiusMaxPixels: 14,
                    stroked: true,
                    lineWidthMinPixels: 2,
                }),
                new TextLayer({
                    id: 'deposit-labels',
                    data: depositPoints,
                    getPosition: (d: any) => d.position,
                    getText: (d: any) => d.name,
                    getSize: 13,
                    getColor: [255, 255, 255, 230],
                    getAngle: 0,
                    getTextAnchor: 'start',
                    getAlignmentBaseline: 'center',
                    getPixelOffset: [14, 0],
                    fontFamily: 'monospace',
                    fontWeight: '600',
                    outlineWidth: 3,
                    outlineColor: [0, 0, 0, 200],
                    billboard: true,
                })
            );
        }

        return deckLayers;
    }, [aoi, depositPoints]);

    const hasOverlays = !!aoi || depositPoints.length > 0;

    return (
        <div className={cn("relative h-full w-full overflow-hidden", className)}>
            <Map
                defaultCenter={mapCenter}
                defaultZoom={14}
                center={mapCenter}
                mapId="climb-map-satellite"
                disableDefaultUI={true}
                gestureHandling={'greedy'}
                className="h-full w-full"
                mapTypeId="satellite"
                tilt={0}
                heading={0}
            >
                <DeckOverlay layers={layers} visible={hasOverlays} />
            </Map>

            {/* Project Name Overlay */}
            <div className="absolute top-3 right-3 rounded-md bg-black/50 px-3 py-1.5 backdrop-blur-sm pointer-events-none z-10">
                <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                    {projectName} • Satellite View
                </span>
            </div>

            {/* Coordinates Overlay */}
            <div className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2.5 py-1 font-mono text-[10px] text-white/60 backdrop-blur-sm pointer-events-none z-10">
                {center}
            </div>

            {/* AOI Indicator */}
            {aoi && (
                <div className="absolute top-3 left-3 rounded-md bg-climb-mint/20 border border-climb-mint/40 px-2.5 py-1 backdrop-blur-sm pointer-events-none z-10">
                    <span className="text-[10px] font-medium text-climb-mint">
                        AOI Polygon Active
                    </span>
                </div>
            )}

            {/* Deposit Count Badge */}
            {depositPoints.length > 0 && (
                <div className="absolute top-12 left-3 rounded-md bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 backdrop-blur-sm pointer-events-none z-10">
                    <span className="text-[10px] font-medium text-amber-400">
                        {depositPoints.length} Known Deposits
                    </span>
                </div>
            )}
        </div>
    );
}
