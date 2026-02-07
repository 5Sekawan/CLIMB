import * as turf from '@turf/turf';
import { Logger } from '../utils/logger';

export interface Voxel {
  id: string;
  x: number;
  y: number;
  z: number; // depth
  lat: number;
  lon: number;
}

export class SpatialGridService {
  /**
   * Generates a 3D grid of voxels ADAPTIVELY.
   * Instead of fixed resolution, it targets a safe total count (e.g. 5000 points).
   * This allows processing 1/4 of Kalimantan without crashing.
   */
  static generateVoxels(
    polygon: [number, number][], // [[lon, lat], ...]
    depthRange: number = 50,
    baseVoxelSize: number = 50 // This is now a "minimum" hint, not strict
  ): Voxel[] {
    const voxels: Voxel[] = [];
    const TARGET_VOXEL_COUNT = 5000; // Safe limit for visualization

    // Create Turf Polygon for validation
    const closedPolygon = polygon[0][0] === polygon[polygon.length - 1][0] && 
                          polygon[0][1] === polygon[polygon.length - 1][1] 
                          ? polygon 
                          : [...polygon, polygon[0]];
    
    const turfPoly = turf.polygon([closedPolygon]);

    // 1. Calculate Bounding Box
    const lons = polygon.map(p => p[0]);
    const lats = polygon.map(p => p[1]);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    // 2. Calculate Adaptive Step Size
    // Width * Height (in degrees) / TargetCount = Step^2
    const latSpan = maxLat - minLat;
    const lonSpan = maxLon - minLon;
    const areaDegrees = latSpan * lonSpan;
    
    // We want roughly TARGET_VOXEL_COUNT points in the 2D plane (for z=0)
    // Actually, we want Total 3D points = 5000. 
    // Let's say we have 3 depth layers. So 2D points = 5000 / 3 = ~1600.
    const target2DCount = Math.floor(TARGET_VOXEL_COUNT / 3); 
    
    // step = sqrt(Area / Count)
    let step = Math.sqrt(areaDegrees / target2DCount);
    
    // Enforce minimum step to avoid infinite loops on tiny polygons
    const minStep = 0.00009; // ~10m
    if (step < minStep) step = minStep;

    // Convert step (degrees) roughly to meters for Z-scaling reference
    const approxResMeters = step * 111000;
    Logger.info(`[SpatialGrid] Adaptive Grid: Span=${latSpan.toFixed(4)}x${lonSpan.toFixed(4)} deg. Step=${step.toFixed(5)} deg (~${Math.round(approxResMeters)}m). Target=${TARGET_VOXEL_COUNT}`);

    // 3. Generate Grid
    let idCounter = 0;
    // We limit the loops to prevent hanging if math is slightly off
    let loopSafety = 0;
    const MAX_LOOPS = 20000; 

    for (let lat = minLat; lat <= maxLat; lat += step) {
      for (let lon = minLon; lon <= maxLon; lon += step) {
        loopSafety++;
        if (loopSafety > MAX_LOOPS) break;

        // 4. Precision Filter: Check if point is inside the AOI polygon
        const point = turf.point([lon, lat]);
        if (turf.booleanPointInPolygon(point, turfPoly)) {
          
          // Generate simplified vertical stack (Just 3 layers for huge areas to save count)
          // Surface, Mid, Deep
          const zLevels = [0, depthRange/2, depthRange]; 
          
          for (const z of zLevels) {
            voxels.push({
              id: `v-${idCounter++}`,
              x: lon,
              y: lat,
              z: z,
              lat: lat,
              lon: lon
            });
          }
        }
      }
    }

    Logger.info(`[SpatialGrid] Generated ${voxels.length} adaptive voxels.`);
    return voxels;
  }
}