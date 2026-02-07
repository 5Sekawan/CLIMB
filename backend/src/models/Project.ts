import mongoose, { Schema, Document } from 'mongoose';

// --- Interfaces ---

export interface IAOI {
  type: 'Polygon';
  coordinates: number[][][]; // GeoJSON standard: [[[lon, lat], ...]]
}

export interface IVoxelData {
  id: string;
  x: number;
  y: number;
  z: number; // depth
  lat: number;
  lon: number;
  au_grade?: number;
  cu_grade?: number;
  rock_type?: string;
  uncertainty?: number;
}

export interface IMineralMetadata {
  label: string;
  color: string;
}

export interface ICachedContext {
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
}

export interface IEconomicParams {
  cogDefault: number;
  baseTonnage: number; // Estimated from initial inference
  baseNetValue: number; // Estimated
  // Detailed params can be stored here or computed
  priceAu?: number;
  priceCu?: number;
  miningCost?: number;
  processingCost?: number;
  recoveryRate?: number;
}

export interface IProject extends Document {
  // --- Identity & Meta ---
  name: string;
  description?: string;
  location: string; // e.g., "East Kalimantan"
  status: 'active' | 'finished' | 'inactive' | 'processing'; // Added processing for internal state
  
  // --- Geospatial ---
  aoi: IAOI;
  center: string; // "lat, lng" for UI display
  area: number; // km2
  elevation: string; // e.g. "100-200m ASL"

  // --- Configuration ---
  minerals: string[]; 
  mineralMetadata: Map<string, IMineralMetadata>;
  documents: mongoose.Types.ObjectId[]; // References to Knowledge Base

  // --- Operational State ---
  driftStatus: 'stable' | 'drifting';
  confidence: number; // 0-100
  lastInferenceAt?: Date;
  createdBy: mongoose.Types.ObjectId; // User ID

  // --- Cached Context (Persisted from Inference) ---
  cachedContext?: ICachedContext;

  // --- Economic Defaults ---
  economicParams: IEconomicParams;

  // --- Reconciliation Stats ---
  reconciliationStats?: {
    avgVariance: number;
    blocksAnalyzed: number;
    blocksDrifting: number;
    blocksStable: number;
    modelBias: string;
    lastReconciliationAt: Date;
  };

  // --- Heavy Data ---
  voxelDataUrl?: string; // URL to JSON file (GCS/Local)
  inferenceResults?: IVoxelData[]; // Deprecated: Kept for legacy support

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// --- Schemas ---

const AOISchema = new Schema({
  type: {
    type: String,
    enum: ['Polygon'],
    required: true,
    default: 'Polygon'
  },
  coordinates: {
    type: [[[Number]]], 
    required: true
  }
}, { _id: false });

const ProjectSchema = new Schema<IProject>({
  name: { 
    type: String, 
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: 100
  },
  description: { type: String, maxlength: 500 },
  location: { type: String, default: 'Unknown Location' },
  
  status: {
    type: String,
    enum: ['active', 'finished', 'inactive', 'processing'],
    default: 'active'
  },

  // Geospatial
  aoi: { 
    type: AOISchema, 
    required: true,
    index: '2dsphere' 
  },
  center: { type: String },
  area: { type: Number, default: 0 },
  elevation: { type: String, default: '0m ASL' },

  // Config
  minerals: { type: [String], default: ['Au', 'Cu'] },
  mineralMetadata: {
    type: Map,
    of: new Schema({ label: String, color: String }, { _id: false }),
    default: {}
  },
  documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],

  // Operational
  driftStatus: {
    type: String,
    enum: ['stable', 'drifting'],
    default: 'stable'
  },
  confidence: { type: Number, default: 0 },
  lastInferenceAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Optional for now to support legacy data

  // Cache
  cachedContext: {
    ragSummary: {
      short: String,
      long: String,
      sourceRef: String
    },
    nearestDeposits: [{
      name: String,
      distance: String,
      grade: String,
      source: String,
      _id: false
    }],
    surfaceFeatures: {
      ndvi: Number,
      thermal: Number,
      swir: Number
    }
  },

  // Economics
  economicParams: {
    cogDefault: { type: Number, default: 0.5 },
    baseTonnage: { type: Number, default: 0 },
    baseNetValue: { type: Number, default: 0 },
    priceAu: Number,
    priceCu: Number,
    miningCost: Number,
    processingCost: Number,
    recoveryRate: Number
  },

  reconciliationStats: {
    avgVariance: Number,
    blocksAnalyzed: Number,
    blocksDrifting: Number,
    blocksStable: Number,
    modelBias: String,
    lastReconciliationAt: Date
  },

  voxelDataUrl: { type: String }, // Path to storage (e.g., /storage/project-id.json)
  
  inferenceResults: {
    type: [Schema.Types.Mixed], // Loose schema to avoid validation overhead on legacy data
    select: false 
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create Model
export const Project = mongoose.model<IProject>('Project', ProjectSchema);
