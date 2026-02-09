/**
 * Generates sphere mesh geometry for 3D rendering.
 * Used with Deck.gl's SimpleMeshLayer to render true 3D spheres.
 * 
 * The mesh format is compatible with @loaders.gl/schema MeshAttributes.
 */

/**
 * Creates a UV sphere mesh geometry compatible with Deck.gl SimpleMeshLayer.
 * 
 * @param radius - Radius of the sphere (default: 1)
 * @param segments - Number of segments for both latitude and longitude (default: 12)
 * @returns Mesh object compatible with SimpleMeshLayer
 */
export function createSphereMesh(radius: number = 1, segments: number = 12) {
    const positions: number[] = [];
    const normals: number[] = [];
    const texCoords: number[] = [];
    const indices: number[] = [];

    // Generate vertices
    for (let lat = 0; lat <= segments; lat++) {
        const theta = (lat * Math.PI) / segments;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let lon = 0; lon <= segments; lon++) {
            const phi = (lon * 2 * Math.PI) / segments;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            // Normal vector (pointing outward from center)
            const nx = cosPhi * sinTheta;
            const ny = cosTheta;
            const nz = sinPhi * sinTheta;

            // Position = normal * radius
            positions.push(nx * radius, ny * radius, nz * radius);
            normals.push(nx, ny, nz);

            // UV texture coordinates
            texCoords.push(lon / segments, lat / segments);
        }
    }

    // Generate indices for triangles
    for (let lat = 0; lat < segments; lat++) {
        for (let lon = 0; lon < segments; lon++) {
            const first = lat * (segments + 1) + lon;
            const second = first + segments + 1;

            // Two triangles per quad
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    // Return format compatible with SimpleMeshLayer mesh prop
    // @see https://deck.gl/docs/api-reference/mesh-layers/simple-mesh-layer#mesh
    return {
        attributes: {
            POSITION: { value: new Float32Array(positions), size: 3 },
            NORMAL: { value: new Float32Array(normals), size: 3 },
            TEXCOORD_0: { value: new Float32Array(texCoords), size: 2 },
        },
        indices: { value: new Uint16Array(indices), size: 1 },
    };
}

/**
 * Creates an icosphere mesh geometry (geodesic sphere made by subdividing an icosahedron).
 * More uniform vertex distribution than UV sphere.
 * 
 * @param radius - Radius of the sphere (default: 1)
 * @param subdivisions - Number of subdivision iterations (default: 2)
 * @returns Mesh object compatible with SimpleMeshLayer
 */
export function createIcosphereMesh(radius: number = 1, subdivisions: number = 2) {
    // Golden ratio for icosahedron vertices
    const t = (1 + Math.sqrt(5)) / 2;

    // Initial icosahedron vertices (normalized)
    const initialVertices: [number, number, number][] = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ];

    // Normalize to unit sphere
    const vertices: [number, number, number][] = initialVertices.map(v => {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / len, v[1] / len, v[2] / len];
    });

    // Initial icosahedron faces (20 triangles)
    let faces: [number, number, number][] = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];

    // Subdivision helper
    const midpointCache = new Map<string, number>();

    const getMidpoint = (i1: number, i2: number): number => {
        const key = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
        const cached = midpointCache.get(key);
        if (cached !== undefined) return cached;

        const v1 = vertices[i1];
        const v2 = vertices[i2];
        const mid: [number, number, number] = [
            (v1[0] + v2[0]) / 2,
            (v1[1] + v2[1]) / 2,
            (v1[2] + v2[2]) / 2,
        ];

        // Normalize to sphere surface
        const len = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1] + mid[2] * mid[2]);
        vertices.push([mid[0] / len, mid[1] / len, mid[2] / len]);

        const index = vertices.length - 1;
        midpointCache.set(key, index);
        return index;
    };

    // Subdivide
    for (let i = 0; i < subdivisions; i++) {
        const newFaces: [number, number, number][] = [];

        for (const [a, b, c] of faces) {
            const ab = getMidpoint(a, b);
            const bc = getMidpoint(b, c);
            const ca = getMidpoint(c, a);

            newFaces.push([a, ab, ca]);
            newFaces.push([b, bc, ab]);
            newFaces.push([c, ca, bc]);
            newFaces.push([ab, bc, ca]);
        }

        faces = newFaces;
        midpointCache.clear();
    }

    // Build geometry arrays
    const positions: number[] = [];
    const normals: number[] = [];
    const texCoords: number[] = [];

    for (let i = 0; i < vertices.length; i++) {
        const [x, y, z] = vertices[i];
        positions.push(x * radius, y * radius, z * radius);

        // For a sphere, normals are just the normalized position
        normals.push(x, y, z);

        // Spherical UV mapping
        const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
        const v = 0.5 - Math.asin(y) / Math.PI;
        texCoords.push(u, v);
    }

    const indices: number[] = [];
    for (const face of faces) {
        indices.push(face[0], face[1], face[2]);
    }

    return {
        attributes: {
            POSITION: { value: new Float32Array(positions), size: 3 },
            NORMAL: { value: new Float32Array(normals), size: 3 },
            TEXCOORD_0: { value: new Float32Array(texCoords), size: 2 },
        },
        indices: { value: new Uint16Array(indices), size: 1 },
    };
}
