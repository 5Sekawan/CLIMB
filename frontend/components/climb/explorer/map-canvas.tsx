"use client";

import React, { useMemo, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { VoxelLegend } from "@/components/climb/ui";
import { Map, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { PointCloudLayer, GeoJsonLayer } from '@deck.gl/layers';
import { useProjectVoxels } from "@/hooks/use-projects";

// --- Color Palette for Minerals ---
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
interface MapCanvasProps {
  className?: string;
  selectedMinerals: string[];
  activeLayerId: string;
  projectName: string;
  center: string;
  projectId?: string;
  aoi?: any; // GeoJSON
  hasVoxels: boolean;
  depthValue?: number;
  opacityValue?: number;
}

// --- Overlay Helper Component ---
function DeckGLOverlay({
  layers,
  selectedMinerals,
  visible
}: {
  layers: any[],
  selectedMinerals: string[],
  visible: boolean
}) {
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

  // Update props whenever layers, selectedMinerals, or visibility changes
  useEffect(() => {
    if (!visible) {
      overlay.setProps({ layers: [], getTooltip: null });
      return;
    }

    overlay.setProps({
      layers,
      getTooltip: ({ object }: any) => {
        if (!object) return null;
        // Check if it's a voxel (has 'z' property)
        if (object.z !== undefined) {
          // Build tooltip with all selected minerals
          const gradeLines = selectedMinerals.map(mineral => {
            const key = MINERAL_GRADE_KEYS[mineral] || `${mineral.toLowerCase()}_grade`;
            const grade = object[key] !== undefined ? object[key].toFixed(2) : 'N/A';
            return `<div><b>${mineral}:</b> ${grade}</div>`;
          }).join('');

          return {
            html: `
              <div style="font-family: monospace; font-size: 12px; padding: 4px;">
                <div><b>ID:</b> ${object.id}</div>
                ${gradeLines}
                <div><b>Depth:</b> ${object.z}m</div>
              </div>
            `,
            style: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              borderRadius: '4px',
              zIndex: '1000'
            }
          };
        }
        return null;
      }
    });
  }, [overlay, layers, selectedMinerals, visible]);

  return null;
}

// --- Main Component ---
export function MapCanvas({
  className,
  selectedMinerals,
  activeLayerId,
  projectName,
  center,
  projectId,
  aoi,
  hasVoxels,
  depthValue = 25,
  opacityValue = 0.75,
}: MapCanvasProps) {

  // 1. Fetch Voxel Data (only if hasVoxels)
  const { data: voxels, isLoading } = useProjectVoxels(hasVoxels && projectId ? projectId : "");

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

    // Layer 2: 3D Voxels (Only if voxel mode is active AND we have voxels)
    if (activeLayerId === 'voxel' && hasVoxels && voxels && voxels.length > 0) {
      // Filter voxels by depth
      const filteredVoxels = voxels.filter((v: any) => Math.abs(v.z) <= depthValue);

      currentLayers.push(
        new PointCloudLayer({
          id: 'voxel-layer',
          data: filteredVoxels,
          pickable: true,
          getPosition: (d: any) => [d.x, d.y, d.z * 5],
          getNormal: [0, 1, 0],
          getColor: (d: any) => {
            // Find highest grade among selected minerals
            let maxGrade = 0;
            let dominantMineral = selectedMinerals[0] || 'Au';

            selectedMinerals.forEach(mineral => {
              const key = MINERAL_GRADE_KEYS[mineral] || `${mineral.toLowerCase()}_grade`;
              const grade = d[key] || 0;
              if (grade > maxGrade) {
                maxGrade = grade;
                dominantMineral = mineral;
              }
            });

            // Normalize grade (0-5 scale to 0-1)
            const n = Math.min(Math.max(maxGrade, 0), 5) / 5;

            // Color based on grade intensity (cold blue → hot red)
            return [
              Math.round(255 * n),                    // R: increases with grade
              Math.round(255 * (1 - Math.abs(0.5 - n) * 2)), // G: peaks at mid
              Math.round(255 * (1 - n)),              // B: decreases with grade
              Math.round(255 * opacityValue)          // A: user-controlled opacity
            ];
          },
          pointSize: 10,
        })
      );
    }

    return currentLayers;
  }, [voxels, selectedMinerals, aoi, activeLayerId, hasVoxels, depthValue, opacityValue]);

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
          selectedMinerals={selectedMinerals}
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

      {activeLayerId === 'voxel' && hasVoxels && (
        <VoxelLegend
          mineralName={selectedMinerals.join(', ')}
          unit="g/t"
          minValue={0.0}
          maxValue={5.0}
          className="absolute bottom-4 right-4 pointer-events-auto z-10 animate-fade-in-up"
        />
      )}

      {isLoading && hasVoxels && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none z-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-climb-mint" />
        </div>
      )}

      {/* No Voxels Message */}
      {activeLayerId === 'voxel' && !hasVoxels && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">No Voxel Model Available</p>
              <p className="text-xs text-white/60 mt-1">Run AI Inference to generate 3D model</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
