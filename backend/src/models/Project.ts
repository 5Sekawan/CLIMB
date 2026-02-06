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
  z: number;
  lat: number;
  lon: number;
  au_grade?: number;
  cu_grade?: number;
  rock_type?: string;
  uncertainty?: number;
}

export interface IEconomicParams {
  priceAu: number; // per oz
  priceCu: number; // per ton
  miningCost: number; // per ton
  processingCost: number; // per ton
  recoveryRate: number; // 0-1
}

export interface IProject extends Document {
  name: string;
  description?: string;
  aoi: IAOI;
  minerals: string[]; // e.g. ['Au', 'Cu']
  status: 'DRAFT' | 'PROCESSING' | 'READY' | 'DRIFTING';
  
  // Operational Parameters
  economicParams: IEconomicParams;
  cog: number; // Cut-off Grade default

  // Caching Layer (Hybrid Intelligence Storage)
  surfaceContext?: {
    ndvi: number;
    thermal: number;
    lastUpdated: Date;
  };
  
  inferenceResults?: IVoxelData[]; // Cached 3D Model
  
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
    type: [[[[Number]]]], // Array of arrays of arrays of numbers
    required: true
  }
}, { _id: false });

const VoxelSchema = new Schema({
  id: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  z: { type: Number, required: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  au_grade: Number,
  cu_grade: Number,
  rock_type: String,
  uncertainty: Number
}, { _id: false });

const ProjectSchema = new Schema<IProject>({
  name: { 
    type: String, 
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: { type: String, maxlength: 500 },
  
  // Geospatial Indexing for fast retrieval
  aoi: { 
    type: AOISchema, 
    required: true,
    index: '2dsphere' // Critical for spatial queries
  },
  
  minerals: { type: [String], default: ['Au', 'Cu'] },
  
  status: {
    type: String,
    enum: ['DRAFT', 'PROCESSING', 'READY', 'DRIFTING'],
    default: 'DRAFT'
  },

  // Defaults for Economic Simulation
  economicParams: {
    priceAu: { type: Number, default: 1800 }, // USD/oz
    priceCu: { type: Number, default: 8500 }, // USD/ton
    miningCost: { type: Number, default: 2.5 }, // USD/ton
    processingCost: { type: Number, default: 12.0 }, // USD/ton
    recoveryRate: { type: Number, default: 0.85 }
  },
  
  cog: { type: Number, default: 0.5 }, // g/t AuEq

  // Cached Results
  surfaceContext: {
    ndvi: Number,
    thermal: Number,
    lastUpdated: Date
  },
  
  inferenceResults: {
    type: [VoxelSchema],
    select: false // Performance: Don't load massive voxel array unless explicitly requested
  }

}, {
  timestamps: true // Auto-manage createdAt/updatedAt
});

// Create Model
export const Project = mongoose.model<IProject>('Project', ProjectSchema);
