// ─── Shared API Types ─────────────────────────────────────────────
// These mirrors the Backend Mongoose Models and Zod Schemas
// ──────────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'finished' | 'inactive' | 'processing';
export type DriftStatus = 'stable' | 'drifting';

export interface IVoxelData {
  id: string;
  x: number;
  y: number;
  z: number;
  lat: number;
  lon: number;
  au_grade?: number;
  cu_grade?: number;
  rock_type?: string;
  uncertainty?: number;
  [key: string]: any;  // Support dynamic mineral grades (e.g., ni_grade, ag_grade)
}

export interface IMineralMetadata {
  label: string;
  color: string;
}

export interface IProject {
  _id: string;
  name: string;
  description?: string;
  location: string;
  status: ProjectStatus;

  // Geospatial
  aoi: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  center: string;
  area: number;
  elevation: string;

  // Config
  minerals: string[];
  mineralMetadata?: Record<string, IMineralMetadata>;
  documents: string[]; // IDs

  // Operational
  driftStatus: DriftStatus;
  confidence: number;
  lastInferenceAt?: string;

  // Cache
  cachedContext?: {
    mineralRecon?: {
      predictedMinerals: string[];
      reasoning: string;
      nearestOccurrences: string[];
      confidence: number;
      reconAt?: string;
      surfaceAnalysis?: {
        ndvi: number;
        thermal: number;
        swir: number;
        interpretation: string;
      };
    };
    ragSummary?: {
      short: string;
      long: string;
      sourceRef: string;
    };
    nearestDeposits?: Array<{
      name: string;
      distance: string;
      grade: string;
      source: string;
    }>;
    surfaceFeatures?: {
      ndvi: number;
      thermal: number;
      swir: number;
    };
  };

  // Economics
  economicParams: {
    cogDefault: number;
    baseTonnage: number;
    baseNetValue: number;
    priceAu?: number;
    priceCu?: number;
  };
}

export interface IActivityLog {
  _id: string;
  type: 'inference' | 'production' | 'reconciliation' | 'system';
  message: string;
  projectId?: string;
  projectName?: string;
  timestamp: string;
}
