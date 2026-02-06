import * as turf from '@turf/turf';

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
   * Generates a 3D grid of voxels within a given polygon boundary
   * Uses Turf.js for precise Point-in-Polygon filtering.
   */
  static generateVoxels(
    polygon: [number, number][], // [[lon, lat], ...]
    depthRange: number = 50,
    voxelSize: number = 5
  ): Voxel[] {
    const voxels: Voxel[] = [];

    // Create Turf Polygon for validation
    // Ensure the polygon is closed (first and last points match)
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

    // 2. Generate Grid (Approximate degree to meters conversion: 0.00001 deg ~ 1.1m)
    // For 5m, we use ~0.000045 degrees
    const step = voxelSize * 0.000009; 

    let idCounter = 0;
    for (let lat = minLat; lat <= maxLat; lat += step) {
      for (let lon = minLon; lon <= maxLon; lon += step) {
        
        // 3. Precision Filter: Check if point is inside the AOI polygon
        const point = turf.point([lon, lat]);
        if (turf.booleanPointInPolygon(point, turfPoly)) {
          
          // Generate vertical stack for valid points
          for (let z = 0; z <= depthRange; z += voxelSize) {
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

    return voxels;
  }
}
