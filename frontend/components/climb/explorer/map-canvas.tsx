"use client";

import React, { useMemo, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { VoxelLegend } from "@/components/climb/ui";
import { Map, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { PointCloudLayer, GeoJsonLayer } from '@deck.gl/layers';
import { useProjectVoxels } from "@/hooks/use-projects";

// --- Types ---
interface MapCanvasProps {
  className?: string;
  selectedMineral: string;
  activeLayerId: string;
  projectName: string;
  center: string;
  projectId?: string;
  aoi?: any; // GeoJSON
}

// --- Overlay Helper Component ---
function DeckGLOverlay({ layers, selectedMineral, visible }: { layers: any[], selectedMineral: string, visible: boolean }) {
  const map = useMap();
  
  // Initialize overlay
  const overlay = useMemo(() => new GoogleMapsOverlay({
    layers: []
  }), []);

  useEffect(() => {
    if (map) {
      overlay.setMap(map);
    }
    return () => {
      overlay.setMap(null);
    };
  }, [map, overlay]);

  // Update props whenever layers, selectedMineral, or visibility changes
  useEffect(() => {
    if (!visible) {
      overlay.setProps({ layers: [], getTooltip: null });
      return;
    }

    overlay.setProps({
      layers,
      getTooltip: ({object}: any) => {
        if (!object) return null;
        // Check if it's a voxel (has 'z' property)
        if (object.z !== undefined) {
          const mineralKey = `${selectedMineral.toLowerCase()}_grade`;
          const grade = object[mineralKey] !== undefined ? object[mineralKey].toFixed(2) : 'N/A';
          
          return {
            html: `
              <div style="font-family: monospace; font-size: 12px; padding: 4px;">
                <div><b>ID:</b> ${object.id}</div>
                <div><b>${selectedMineral}:</b> ${grade}</div>
                <div><b>Depth:</b> ${object.z}m</div>
              </div>
            `,
            style: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              borderRadius: '4px',
              zIndex: 1000
            }
          };
        }
        return null;
      }
    });
  }, [overlay, layers, selectedMineral, visible]);

  return null;
}

// --- Main Component ---
export function MapCanvas({
  className,
  selectedMineral,
  activeLayerId,
  projectName,
  center,
  projectId,
  aoi
}: MapCanvasProps) {
  
  // 1. Fetch Voxel Data
  const { data: voxels, isLoading } = useProjectVoxels(projectId || "");

  // 2. Parse Center for View State
  const defaultCenter = { lat: -1.523, lng: 116.842 };
  const mapCenter = useMemo(() => {
    if (!center) return defaultCenter;
    const parts = center.split(',').map(s => parseFloat(s.replace(/[^\d.-]/g, '')));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
    return defaultCenter;
  }, [center]);

  // 3. Construct Layers
  const layers = useMemo(() => {
    const currentLayers: any[] = [];

    // Layer 1: AOI Polygon (Visible in both modes for context)
    if (aoi) {
      currentLayers.push(
        new GeoJsonLayer({
          id: 'aoi-layer',
          data: aoi,
          stroked: true,
          filled: true,
          lineWidthMinPixels: 2,
          getLineColor: [16, 185, 129], // climb-mint
          getFillColor: activeLayerId === 'voxel' ? [16, 185, 129, 20] : [16, 185, 129, 40],
        })
      );
    }

    // Layer 2: 3D Voxels (Only if voxel mode is active)
    if (activeLayerId === 'voxel' && voxels && voxels.length > 0) {
      currentLayers.push(
        new PointCloudLayer({
          id: 'voxel-layer',
          data: voxels,
          pickable: true,
          getPosition: (d: any) => [d.x, d.y, d.z * 5], 
          getNormal: [0, 1, 0],
          getColor: (d: any) => {
            const grade = selectedMineral === 'Au' ? d.au_grade : d.cu_grade;
            const n = Math.min(Math.max(grade || 0, 0), 5) / 5;
            return [255 * n, 255 * (1 - Math.abs(0.5 - n) * 2), 255 * (1 - n)];
          },
          pointSize: 10,
          opacity: 0.8
        })
      );
    }

    return currentLayers;
  }, [voxels, selectedMineral, aoi, activeLayerId]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-slate-950", className)}>
      <Map
        defaultCenter={mapCenter}
        defaultZoom={16}
        center={mapCenter}
        mapId={activeLayerId === 'satellite' ? "climb-map-satellite" : "climb-map-dark"}
        disableDefaultUI={true}
        gestureHandling={'greedy'}
        className="h-full w-full"
        mapTypeId={activeLayerId === 'satellite' ? 'satellite' : 'roadmap'}
        tilt={activeLayerId === 'voxel' ? 45 : 0}
        heading={0}
      >
        <DeckGLOverlay 
          layers={layers} 
          selectedMineral={selectedMineral} 
          visible={activeLayerId === 'voxel' || (activeLayerId === 'satellite' && !!aoi)} 
        />
      </Map>

      {/* Overlays */}
      <div className="absolute top-3 right-3 rounded-md bg-black/50 px-3 py-1.5 backdrop-blur-sm pointer-events-none z-10">
        <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
          {projectName} • {activeLayerId === 'satellite' ? 'Surface View' : 'Voxel Model'}
        </span>
      </div>

      <div className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2.5 py-1 font-mono text-[10px] text-white/60 backdrop-blur-sm pointer-events-none z-10">
        {center}
      </div>

      {activeLayerId === 'voxel' && (
        <VoxelLegend
          mineralName={selectedMineral}
          unit="g/t"
          minValue={0.0}
          maxValue={5.0}
          className="absolute bottom-4 right-4 pointer-events-auto z-10 animate-fade-in-up"
        />
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none z-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-climb-mint" />
        </div>
      )}
    </div>
  );
}
