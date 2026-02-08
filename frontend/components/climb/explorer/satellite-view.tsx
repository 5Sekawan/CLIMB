"use client";

import React, { useMemo } from 'react';
import { cn } from "@/lib/utils";
import { Map } from '@vis.gl/react-google-maps';

interface SatelliteViewProps {
    className?: string;
    projectName: string;
    center: string;
    aoi?: any; // GeoJSON Polygon
}

export function SatelliteView({
    className,
    projectName,
    center,
    aoi,
}: SatelliteViewProps) {
    // Parse Center for View State
    const defaultCenter = { lat: -1.523, lng: 116.842 };
    const mapCenter = useMemo(() => {
        if (!center) return defaultCenter;
        const parts = center.split(',').map(s => parseFloat(s.replace(/[^\d.-]/g, '')));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { lat: parts[0], lng: parts[1] };
        }
        return defaultCenter;
    }, [center]);

    return (
        <div className={cn("relative h-full w-full overflow-hidden", className)}>
            <Map
                defaultCenter={mapCenter}
                defaultZoom={16}
                center={mapCenter}
                mapId="climb-map-satellite"
                disableDefaultUI={true}
                gestureHandling={'greedy'}
                className="h-full w-full"
                mapTypeId="satellite"
                tilt={0}
                heading={0}
            />

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
                        AOI Defined
                    </span>
                </div>
            )}
        </div>
    );
}
