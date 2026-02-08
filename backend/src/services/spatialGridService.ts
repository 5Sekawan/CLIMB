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

export interface VoxelBatch {
  batchId: number;
  voxels: Voxel[];
  centroid: { lat: number; lon: number };
  boundingBox: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

// Configuration constants
const MAX_TOTAL_VOXELS = 10000;
const VOXELS_PER_BATCH = 500;
const DEFAULT_DEPTH_RANGE = 50;
const DEFAULT_VOXEL_SIZE = 5;

export class SpatialGridService {
  /**
   * Generates a 3D grid of voxels within a given polygon boundary
   * Uses Turf.js for precise Point-in-Polygon filtering.
   * Automatically adapts resolution to stay within MAX_TOTAL_VOXELS limit.
   */
  static generateVoxels(
    polygon: [number, number][], // [[lon, lat], ...]
    depthRange: number = DEFAULT_DEPTH_RANGE,
    voxelSize: number = DEFAULT_VOXEL_SIZE
  ): Voxel[] {
    // Create Turf Polygon for validation
    const closedPolygon = polygon[0][0] === polygon[polygon.length - 1][0] &&
      polygon[0][1] === polygon[polygon.length - 1][1]
      ? polygon
      : [...polygon, polygon[0]];

    const turfPoly = turf.polygon([closedPolygon]);

    // Calculate bounding box
    const lons = polygon.map(p => p[0]);
    const lats = polygon.map(p => p[1]);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    // Calculate area to determine adaptive step size
    const areaKm2 = turf.area(turfPoly) / 1_000_000; // Convert m² to km²
    const depthLevels = Math.ceil(depthRange / voxelSize);

    // Estimate voxels with base step and adapt if needed
    let step = voxelSize * 0.000009; // ~1m resolution
    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;

    // Estimate how many surface points we'd generate
    const estimatedSurfacePoints = (latRange / step) * (lonRange / step) * 0.7; // 0.7 = polygon fill factor
    const estimatedVoxels = estimatedSurfacePoints * depthLevels;

    // Adapt step size if we'd exceed max voxels
    if (estimatedVoxels > MAX_TOTAL_VOXELS) {
      const scaleFactor = Math.sqrt(estimatedVoxels / MAX_TOTAL_VOXELS);
      step = step * scaleFactor;
      Logger.info(`[SpatialGrid] Adaptive resolution: step=${(step * 111000).toFixed(2)}m (scaled ${scaleFactor.toFixed(2)}x for ${areaKm2.toFixed(3)}km² area)`);
    }

    const voxels: Voxel[] = [];
    let idCounter = 0;

    for (let lat = minLat; lat <= maxLat; lat += step) {
      for (let lon = minLon; lon <= maxLon; lon += step) {
        // Check if point is inside the AOI polygon
        const point = turf.point([lon, lat]);
        if (turf.booleanPointInPolygon(point, turfPoly)) {
          // Generate vertical stack for valid points
          for (let z = 0; z <= depthRange; z += voxelSize) {
            // Hard cap to prevent runaway
            if (voxels.length >= MAX_TOTAL_VOXELS) {
              Logger.warn(`[SpatialGrid] Reached maximum voxel limit (${MAX_TOTAL_VOXELS}). Truncating.`);
              return voxels;
            }

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

    Logger.info(`[SpatialGrid] Generated ${voxels.length} voxels (max: ${MAX_TOTAL_VOXELS})`);
    return voxels;
  }

  /**
   * Splits voxels into batches for parallel processing.
   * Each batch includes its own centroid and bounding box for localized geospatial calculations.
   */
  static batchVoxels(voxels: Voxel[], batchSize: number = VOXELS_PER_BATCH): VoxelBatch[] {
    const batches: VoxelBatch[] = [];
    const totalBatches = Math.ceil(voxels.length / batchSize);

    for (let i = 0; i < voxels.length; i += batchSize) {
      const batchVoxels = voxels.slice(i, i + batchSize);
      const batchId = Math.floor(i / batchSize);

      // Calculate centroid for this batch
      const lats = batchVoxels.map(v => v.lat);
      const lons = batchVoxels.map(v => v.lon);

      const centroid = {
        lat: lats.reduce((a, b) => a + b, 0) / lats.length,
        lon: lons.reduce((a, b) => a + b, 0) / lons.length
      };

      const boundingBox = {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLon: Math.min(...lons),
        maxLon: Math.max(...lons)
      };

      batches.push({
        batchId,
        voxels: batchVoxels,
        centroid,
        boundingBox
      });
    }

    Logger.info(`[SpatialGrid] Split ${voxels.length} voxels into ${batches.length} batches (${batchSize} per batch)`);
    return batches;
  }

  /**
   * Creates a GeoJSON polygon from a batch's bounding box (for satellite queries)
   */
  static batchToGeoJSON(batch: VoxelBatch): { type: string; coordinates: number[][][] } {
    const { minLat, maxLat, minLon, maxLon } = batch.boundingBox;
    return {
      type: 'Polygon',
      coordinates: [[
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat]
      ]]
    };
  }
}
