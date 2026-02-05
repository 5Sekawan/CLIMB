"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpatialGridService = void 0;
class SpatialGridService {
    /**
     * Generates a 3D grid of voxels within a given polygon boundary
     * For prototype: We simplify by using a bounding box grid and filtering points inside the polygon
     */
    static generateVoxels(polygon, // [[lon, lat], ...]
    depthRange = 50, voxelSize = 5) {
        const voxels = [];
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
                // Only add if point is inside polygon (simplified point-in-polygon check can be added here)
                // For the prototype, we assume all points in the bounding box are candidate for inference
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
        return voxels;
    }
}
exports.SpatialGridService = SpatialGridService;
//# sourceMappingURL=spatialGridService.js.map