export interface Voxel {
    id: string;
    x: number;
    y: number;
    z: number;
    lat: number;
    lon: number;
}
export declare class SpatialGridService {
    /**
     * Generates a 3D grid of voxels within a given polygon boundary
     * For prototype: We simplify by using a bounding box grid and filtering points inside the polygon
     */
    static generateVoxels(polygon: [number, number][], // [[lon, lat], ...]
    depthRange?: number, voxelSize?: number): Voxel[];
}
//# sourceMappingURL=spatialGridService.d.ts.map