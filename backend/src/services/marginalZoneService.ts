import { IVoxelData } from '../models/Project';
import { Logger } from '../utils/logger';

// ─── Interfaces ──────────────────────────────────────────────

export interface MarginalZoneInput {
    selectedMinerals: string[];       // e.g. ['Au', 'Cu']
    mineralPrices: Record<string, number>; // e.g. { Au: 2000, Cu: 8500 }
    mineralUnits: Record<string, string>;  // e.g. { Au: 'oz', Cu: 'ton' }
    miningCost: number;               // USD/ton material
    processingCost: number;            // USD/ton ore
    recoveryFactor: number;            // 0.0 - 1.0
    density: number;                   // t/m³ (default 2.5)
}

export interface IMarginalZoneStats {
    npv: number;
    totalTonnage: number;
    oreTonnage: number;
    wasteTonnage: number;
    avgGrades: Record<string, number>; // mineral → avg grade
    totalRevenue: number;
    totalCost: number;
    dilutionRatio: number;             // waste / (ore + waste) within zone
    oreCount: number;
    wasteCount: number;
    marginalCount: number;
}

export interface IMarginalZone {
    id: string;
    name: string;
    rank: number;
    voxelIds: string[];
    boundingBox: {
        minLat: number; maxLat: number;
        minLon: number; maxLon: number;
        minDepth: number; maxDepth: number;
    };
    centerLat: number;
    centerLon: number;
    stats: IMarginalZoneStats;
}

export interface MarginalZoneResult {
    zones: IMarginalZone[];
    economicParams: MarginalZoneInput;
    cogPerMineral: Record<string, number>;
    generatedAt: Date;
}

// ─── Internal types ──────────────────────────────────────────

interface ValuedVoxel extends IVoxelData {
    netValue: number;
    revenue: number;
    cost: number;
    classification: 'ore' | 'marginal' | 'waste';
    gradeAboveCog: boolean;
}

// ─── Constants ───────────────────────────────────────────────

const VOXEL_SIZE = 5;                     // 5m per side
const VOXEL_VOLUME = VOXEL_SIZE ** 3;     // 125 m³
const OZ_PER_GRAM = 1 / 31.1035;         // grams to troy ounces
const COG_MARGINAL_BAND = 0.15;           // ±15% from COG = marginal
const MIN_ZONE_VOXELS = 3;               // Min voxels to form a zone
const SPATIAL_TOLERANCE = 0.0001;         // ~11m lat/lon tolerance for adjacency

// ─── Service ─────────────────────────────────────────────────

export class MarginalZoneService {

    /**
     * Main entry: analyze voxels and produce ranked marginal zones.
     */
    static analyze(
        voxels: IVoxelData[],
        input: MarginalZoneInput
    ): MarginalZoneResult {
        Logger.info(`[MarginalZone] Starting analysis: ${voxels.length} voxels, minerals: ${input.selectedMinerals.join(', ')}`);

        // 1. Calculate COG per mineral
        const cogPerMineral = this.calculateCOGs(input);
        Logger.info(`[MarginalZone] COGs: ${JSON.stringify(cogPerMineral)}`);

        // 2. Value each voxel
        const valuedVoxels = this.valueVoxels(voxels, input, cogPerMineral);
        Logger.info(`[MarginalZone] Valued voxels — Ore: ${valuedVoxels.filter(v => v.classification === 'ore').length}, Marginal: ${valuedVoxels.filter(v => v.classification === 'marginal').length}, Waste: ${valuedVoxels.filter(v => v.classification === 'waste').length}`);

        // 3. Greedy block expansion to form zones
        const rawZones = this.greedyBlockExpansion(valuedVoxels, input);
        Logger.info(`[MarginalZone] Greedy expansion produced ${rawZones.length} raw zones`);

        // 4. Build zone metadata, rank by NPV
        const zones = this.buildZones(rawZones, valuedVoxels, input)
            .sort((a, b) => b.stats.npv - a.stats.npv)
            .map((z, i) => ({ ...z, rank: i + 1, name: `Zone ${String.fromCharCode(65 + i)}` }));

        Logger.info(`[MarginalZone] Final zones: ${zones.length}, top NPV: $${zones[0]?.stats.npv.toLocaleString() || 0}`);

        return {
            zones,
            economicParams: input,
            cogPerMineral,
            generatedAt: new Date(),
        };
    }

    // ─── Step 1: COG Calculation ─────────────────────────────

    /**
     * COG = (MiningCost + ProcessingCost) / (Price × RecoveryFactor × ConversionFactor)
     * ConversionFactor depends on the unit:
     *   - 'oz' minerals (Au, Ag): grade is g/t → convert to oz/t = grade × OZ_PER_GRAM
     *   - 'ton' minerals (Cu, Ni, etc.): grade is % → content = grade/100
     */
    private static calculateCOGs(input: MarginalZoneInput): Record<string, number> {
        const { miningCost, processingCost, recoveryFactor, mineralPrices, mineralUnits, selectedMinerals } = input;
        const totalCostPerTon = miningCost + processingCost;
        const cogs: Record<string, number> = {};

        for (const mineral of selectedMinerals) {
            const price = mineralPrices[mineral] || 0;
            const unit = (mineralUnits[mineral] || 'ton').toLowerCase();

            if (price <= 0) {
                cogs[mineral] = Infinity; // Cannot be profitable
                continue;
            }

            if (unit === 'oz') {
                // Grade in g/t → revenue per ton = grade × OZ_PER_GRAM × price × recovery
                // COG: totalCost = COG × OZ_PER_GRAM × price × recovery → COG = totalCost / (OZ_PER_GRAM × price × recovery)
                cogs[mineral] = totalCostPerTon / (OZ_PER_GRAM * price * recoveryFactor);
            } else {
                // Grade in % → revenue per ton = (grade/100) × price × recovery
                // COG: totalCost = (COG/100) × price × recovery → COG = (totalCost × 100) / (price × recovery)
                cogs[mineral] = (totalCostPerTon * 100) / (price * recoveryFactor);
            }
        }

        return cogs;
    }

    // ─── Step 2: Voxel Valuation ─────────────────────────────

    private static valueVoxels(
        voxels: IVoxelData[],
        input: MarginalZoneInput,
        cogPerMineral: Record<string, number>
    ): ValuedVoxel[] {
        const { selectedMinerals, mineralPrices, mineralUnits, miningCost, processingCost, recoveryFactor, density } = input;
        const tonnagePerVoxel = VOXEL_VOLUME * density;

        return voxels.map(v => {
            let totalRevenue = 0;
            let gradeAboveCog = false;
            let anyMarginal = false;

            for (const mineral of selectedMinerals) {
                const gradeKey = `${mineral.toLowerCase()}_grade`;
                const grade = (v as any)[gradeKey] || 0;
                const price = mineralPrices[mineral] || 0;
                const unit = (mineralUnits[mineral] || 'ton').toLowerCase();
                const cog = cogPerMineral[mineral] || 0;

                // Check grade vs COG
                if (grade >= cog) {
                    gradeAboveCog = true;
                } else if (grade >= cog * (1 - COG_MARGINAL_BAND)) {
                    anyMarginal = true;
                }

                // Revenue calculation
                if (unit === 'oz') {
                    // g/t → oz per voxel = grade × tonnage × OZ_PER_GRAM
                    totalRevenue += grade * tonnagePerVoxel * OZ_PER_GRAM * price * recoveryFactor;
                } else {
                    // % → tons of metal = (grade/100) × tonnage
                    totalRevenue += (grade / 100) * tonnagePerVoxel * price * recoveryFactor;
                }
            }

            // Cost depends on classification
            const isOre = gradeAboveCog;
            const voxelCost = isOre
                ? (miningCost + processingCost) * tonnagePerVoxel
                : miningCost * tonnagePerVoxel;

            const netValue = totalRevenue - voxelCost;

            let classification: 'ore' | 'marginal' | 'waste';
            if (gradeAboveCog && netValue > 0) {
                classification = 'ore';
            } else if (anyMarginal || (gradeAboveCog && netValue <= 0)) {
                classification = 'marginal';
            } else {
                classification = 'waste';
            }

            return {
                ...v,
                netValue,
                revenue: totalRevenue,
                cost: voxelCost,
                classification,
                gradeAboveCog,
            };
        });
    }

    // ─── Step 3: Greedy Block Expansion ──────────────────────

    /**
     * Greedy approach:
     * 1. Sort all ore voxels by netValue descending
     * 2. Pick the highest unassigned ore voxel as a seed
     * 3. Expand to adjacent voxels if they improve zone value or are needed for contiguity
     * 4. Repeat until no unassigned ore voxels remain
     */
    private static greedyBlockExpansion(
        valuedVoxels: ValuedVoxel[],
        input: MarginalZoneInput
    ): ValuedVoxel[][] {
        const zones: ValuedVoxel[][] = [];
        const assigned = new Set<string>();

        // Build spatial index for fast adjacency lookups
        const voxelMap = new Map<string, ValuedVoxel>();
        valuedVoxels.forEach(v => voxelMap.set(v.id, v));

        // Build coordinate-based adjacency index
        // Key: "lat_lon_z" rounded to tolerance
        const coordIndex = new Map<string, ValuedVoxel[]>();
        valuedVoxels.forEach(v => {
            const key = this.coordKey(v);
            if (!coordIndex.has(key)) coordIndex.set(key, []);
            coordIndex.get(key)!.push(v);
        });

        // Sort ore + marginal voxels by net value descending (seeds)
        const seeds = valuedVoxels
            .filter(v => v.classification === 'ore' || v.classification === 'marginal')
            .sort((a, b) => b.netValue - a.netValue);

        for (const seed of seeds) {
            if (assigned.has(seed.id)) continue;
            if (seed.netValue <= 0) continue; // Skip negative-value seeds

            // Start a new zone from this seed
            const zone: ValuedVoxel[] = [seed];
            assigned.add(seed.id);
            let zoneNPV = seed.netValue;

            // BFS expansion
            const frontier = this.getAdjacentVoxels(seed, valuedVoxels, coordIndex);
            const considered = new Set<string>([seed.id]);

            // Priority queue (sorted by potential contribution)
            const candidates = frontier
                .filter(v => !assigned.has(v.id) && !considered.has(v.id))
                .sort((a, b) => b.netValue - a.netValue);

            for (const candidate of candidates) {
                considered.add(candidate.id);
            }

            let candidateQueue = [...candidates];

            while (candidateQueue.length > 0) {
                const candidate = candidateQueue.shift()!;

                if (assigned.has(candidate.id)) continue;

                // Greedy criterion: add if it improves or maintains zone NPV
                // Also add marginal/waste if net value > -threshold (dilution tolerance)
                const tonnagePerVoxel = VOXEL_VOLUME * input.density;
                const dilutionThreshold = -(input.miningCost * tonnagePerVoxel * 0.5); // Accept up to 50% mining cost as dilution penalty

                if (candidate.netValue > dilutionThreshold) {
                    zone.push(candidate);
                    assigned.add(candidate.id);
                    zoneNPV += candidate.netValue;

                    // Add new neighbors to frontier
                    const newNeighbors = this.getAdjacentVoxels(candidate, valuedVoxels, coordIndex)
                        .filter(v => !assigned.has(v.id) && !considered.has(v.id));

                    for (const n of newNeighbors) {
                        considered.add(n.id);
                        candidateQueue.push(n);
                    }

                    // Re-sort by value
                    candidateQueue.sort((a, b) => b.netValue - a.netValue);
                }
            }

            // Only keep zones with positive NPV and minimum size
            if (zoneNPV > 0 && zone.length >= MIN_ZONE_VOXELS) {
                zones.push(zone);
            }
        }

        return zones;
    }

    /**
     * Find spatially adjacent voxels (same x/y different z, or adjacent x/y same z)
     */
    private static getAdjacentVoxels(
        voxel: ValuedVoxel,
        _allVoxels: ValuedVoxel[],
        coordIndex: Map<string, ValuedVoxel[]>
    ): ValuedVoxel[] {
        const neighbors: ValuedVoxel[] = [];
        const latStep = SPATIAL_TOLERANCE * 5; // Search radius
        const lonStep = SPATIAL_TOLERANCE * 5;

        // Check all adjacent positions (6-connected: ±x, ±y, ±z)
        const offsets = [
            { dLat: latStep, dLon: 0, dZ: 0 },
            { dLat: -latStep, dLon: 0, dZ: 0 },
            { dLat: 0, dLon: lonStep, dZ: 0 },
            { dLat: 0, dLon: -lonStep, dZ: 0 },
            { dLat: 0, dLon: 0, dZ: VOXEL_SIZE },
            { dLat: 0, dLon: 0, dZ: -VOXEL_SIZE },
        ];

        for (const offset of offsets) {
            const targetLat = voxel.lat + offset.dLat;
            const targetLon = voxel.lon + offset.dLon;
            const targetZ = voxel.z + offset.dZ;
            const key = this.makeCoordKey(targetLat, targetLon, targetZ);

            const candidates = coordIndex.get(key);
            if (candidates) {
                neighbors.push(...candidates.filter(c => c.id !== voxel.id));
            }
        }

        return neighbors;
    }

    private static coordKey(v: ValuedVoxel): string {
        return this.makeCoordKey(v.lat, v.lon, v.z);
    }

    private static makeCoordKey(lat: number, lon: number, z: number): string {
        // Round to spatial tolerance to group nearby voxels
        const rLat = Math.round(lat / SPATIAL_TOLERANCE) * SPATIAL_TOLERANCE;
        const rLon = Math.round(lon / SPATIAL_TOLERANCE) * SPATIAL_TOLERANCE;
        const rZ = Math.round(z / VOXEL_SIZE) * VOXEL_SIZE;
        return `${rLat.toFixed(5)}_${rLon.toFixed(5)}_${rZ}`;
    }

    // ─── Step 4: Build Zone Metadata ─────────────────────────

    private static buildZones(
        rawZones: ValuedVoxel[][],
        _allVoxels: ValuedVoxel[],
        input: MarginalZoneInput
    ): IMarginalZone[] {
        const tonnagePerVoxel = VOXEL_VOLUME * input.density;

        return rawZones.map((zoneVoxels, idx) => {
            const oreVoxels = zoneVoxels.filter(v => v.classification === 'ore');
            const wasteVoxels = zoneVoxels.filter(v => v.classification === 'waste');
            const marginalVoxels = zoneVoxels.filter(v => v.classification === 'marginal');

            // Avg grades per mineral
            const avgGrades: Record<string, number> = {};
            for (const mineral of input.selectedMinerals) {
                const gradeKey = `${mineral.toLowerCase()}_grade`;
                const grades = zoneVoxels.map(v => (v as any)[gradeKey] || 0);
                avgGrades[mineral] = grades.length > 0
                    ? grades.reduce((a, b) => a + b, 0) / grades.length
                    : 0;
            }

            // Bounding box
            const lats = zoneVoxels.map(v => v.lat);
            const lons = zoneVoxels.map(v => v.lon);
            const depths = zoneVoxels.map(v => Math.abs(v.z));

            const totalRevenue = zoneVoxels.reduce((s, v) => s + v.revenue, 0);
            const totalCost = zoneVoxels.reduce((s, v) => s + v.cost, 0);
            const npv = totalRevenue - totalCost;

            const totalCount = zoneVoxels.length;
            const dilutionRatio = totalCount > 0
                ? (wasteVoxels.length + marginalVoxels.length) / totalCount
                : 0;

            return {
                id: `mz-${idx}`,
                name: `Zone ${idx + 1}`,
                rank: idx + 1,
                voxelIds: zoneVoxels.map(v => v.id),
                boundingBox: {
                    minLat: Math.min(...lats),
                    maxLat: Math.max(...lats),
                    minLon: Math.min(...lons),
                    maxLon: Math.max(...lons),
                    minDepth: Math.min(...depths),
                    maxDepth: Math.max(...depths),
                },
                centerLat: lats.reduce((a, b) => a + b, 0) / lats.length,
                centerLon: lons.reduce((a, b) => a + b, 0) / lons.length,
                stats: {
                    npv,
                    totalTonnage: totalCount * tonnagePerVoxel,
                    oreTonnage: oreVoxels.length * tonnagePerVoxel,
                    wasteTonnage: (wasteVoxels.length + marginalVoxels.length) * tonnagePerVoxel,
                    avgGrades,
                    totalRevenue,
                    totalCost,
                    dilutionRatio,
                    oreCount: oreVoxels.length,
                    wasteCount: wasteVoxels.length,
                    marginalCount: marginalVoxels.length,
                },
            };
        });
    }
}
