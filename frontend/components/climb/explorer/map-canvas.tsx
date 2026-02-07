"use client";

import React, { useMemo } from 'react';
import { cn } from "@/lib/utils";
import { VoxelLegend } from "@/components/climb/ui";
import DeckGL from '@deck.gl/react';
import { PointCloudLayer, GeoJsonLayer } from '@deck.gl/layers';
import { BitmapLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { MapView, FirstPersonView } from '@deck.gl/core';
import { useProjectVoxels } from "@/hooks/use-projects";

// --- Types ---
interface MapCanvasProps {
  className?: string;
  selectedMineral: string;
  projectName: string;
  center: string;
  projectId?: string; // Needed to fetch voxels
  aoi?: any; // GeoJSON
}

// --- Constants ---
const INITIAL_VIEW_STATE = {
  longitude: 116.842, // Default to Indo center
  latitude: -1.523,
  zoom: 14,
  pitch: 45,
  bearing: 0,
  minZoom: 2,
  maxZoom: 20,
};

// OpenStreetMap Tile Layer (Free, no key required)
const tileLayer = new TileLayer({
  data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
  minZoom: 0,
  maxZoom: 19,
  tileSize: 256,
  renderSubLayers: (props: any) => {
    const {
      bbox: {west, south, east, north}
    } = props.tile;

    return new BitmapLayer(props, {
      data: null,
      image: props.data,
      bounds: [west, south, east, north]
    });
  }
});

export function MapCanvas({
  className,
  selectedMineral,
  projectName,
  center,
  projectId,
  aoi
}: MapCanvasProps) {
  
  // 1. Fetch Voxel Data
  // If projectId is missing (e.g. mock mode), we pass undefined which disables the query
  const { data: voxels, isLoading } = useProjectVoxels(projectId || "");

  // 2. Parse Center for View State
  const viewState = useMemo(() => {
    if (!center) return INITIAL_VIEW_STATE;
    const parts = center.split(',').map(s => parseFloat(s.replace(/[^\d.-]/g, '')));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      // Assuming "lat, lon" format from string
      return {
        ...INITIAL_VIEW_STATE,
        latitude: parts[0],
        longitude: parts[1],
      };
    }
    return INITIAL_VIEW_STATE;
  }, [center]);

  // 3. Construct Layers
  const layers = [
    tileLayer,
    // AOI Layer (Polygon)
    aoi ? new GeoJsonLayer({
      id: 'aoi-layer',
      data: aoi,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 2,
      getLineColor: [16, 185, 129], // climb-mint
      getFillColor: [16, 185, 129, 40], // climb-mint transparent
    }) : null,
    // Voxels
    voxels && voxels.length > 0 ? new PointCloudLayer({
      id: 'voxel-layer',
      data: voxels,
      pickable: true,
      coordinateSystem: undefined, // LNGLAT
      coordinateOrigin: [0, 0, 0],
      getPosition: (d: any) => [d.x, d.y, d.z * 10], // Exaggerate Z for visibility
      getNormal: [0, 1, 0],
      getColor: (d: any) => {
        // Dynamic color based on selected mineral
        const grade = selectedMineral === 'Au' ? d.au_grade : d.cu_grade;
        // Simple heatmap: Blue (low) -> Green -> Red (high)
        // Normalize 0-5 g/t
        const n = Math.min(Math.max(grade || 0, 0), 5) / 5;
        return [255 * n, 255 * (1 - Math.abs(0.5 - n) * 2), 255 * (1 - n)];
      },
      pointSize: 5, // Pixels
      onHover: (info: any) => {
        // console.log('Hover:', info.object);
      }
    }) : null
  ];

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-slate-950", className)}>
      <DeckGL
        initialViewState={viewState}
        controller={true}
        layers={layers}
        getTooltip={({object}: any) => object && {
          html: `
            <div style="font-family: monospace; font-size: 12px;">
              <div><b>ID:</b> ${object.id}</div>
              <div><b>${selectedMineral}:</b> ${object[`${selectedMineral.toLowerCase()}_grade`]?.toFixed(2)}</div>
              <div><b>Depth:</b> ${object.z}m</div>
            </div>
          `
        }}
      >
      </DeckGL>

      {/* Overlays */}
      <div className="absolute top-3 right-3 rounded-md bg-black/50 px-3 py-1.5 backdrop-blur-sm pointer-events-none">
        <span className="text-xs font-semibold text-white/90">
          {projectName}
        </span>
      </div>

      <div className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2.5 py-1 font-mono text-[10px] text-white/60 backdrop-blur-sm pointer-events-none">
        {center}
      </div>

      <VoxelLegend
        mineralName={selectedMineral}
        unit="g/t"
        minValue={0.0}
        maxValue={5.0}
        className="absolute bottom-4 right-4 pointer-events-auto"
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-climb-mint" />
        </div>
      )}
    </div>
  );
}