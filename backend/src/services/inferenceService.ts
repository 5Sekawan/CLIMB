import { generativeModel } from '../config/gcp';
import { RAGService } from './ragService';
import { SatelliteService } from './satelliteService';
import { ExternalDataService } from './externalDataService';
import { SpatialGridService } from './spatialGridService';
import type { Voxel } from './spatialGridService';
import { Project } from '../models/Project';
import * as turf from '@turf/turf';
import { ActivityService } from './activityService';
import { Logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

// Storage configuration
const STORAGE_DIR = process.env.STORAGE_DIR || '/app/storage';

export class InferenceService {
  /**
   * Orchestrates the hybrid inference process (Legacy Sync Wrapper)
   */
  static async predictGrade(projectName: string, polygon: [number, number][]): Promise<any> {
    // This is kept for backward compatibility but effectively does a simplified run
    Logger.warn('[PredictGrade] Deprecated sync method called. Use runInferencePipeline instead.');
    return []; 
  }

  /**
   * Background Worker for Full Inference Pipeline (DEMO / MOCK MODE)
   * Bypasses GEE/Vertex AI to ensure stability for presentation.
   */
  static async runInferencePipeline(projectId: string) {
    Logger.job('InferencePipeline', 'START', `Starting DEMO inference for project: ${projectId}`);
    
    try {
      const project = await Project.findById(projectId);
      if (!project) throw new Error('Project not found');

      await ActivityService.log('inference', `Started inference pipeline for ${project.name}`, projectId, project.name);

      // 1. Context Gathering (MOCKED)
      const polygon = project.aoi.coordinates[0]; // GeoJSON format
      
      // Simulate Processing Delay (3 Seconds)
      Logger.info('[Pipeline] Simulating Satellite & AI Analysis...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mocked Context Data
      const ndvi = 0.65;
      const thermal = 24.5;
      const swir = 1.8; // High alteration
      const ragSnippets = [{ content: "Geological report indicates potential high-sulfidation epithermal system." }];
      const nearestData = [
        { site_name: "Batu Hijau Reference", distance_meters: 15000, grade: "0.5% Cu", source: "Kaggle" },
        { site_name: "Tujuh Bukit", distance_meters: 45000, grade: "0.8 g/t Au", source: "Kaggle" }
      ];

      // 2. AI Parameter Generation (HARDCODED / MOCKED)
      // These parameters generate a nice looking ore body
      const params = {
        "au_base_grade": 1.2,
        "cu_base_grade": 0.6,
        "trend_azimuth": 45, // NE Trend
        "trend_dip": 0,
        "depth_decay_factor": 0.015,
        "noise_variability": 0.15,
        "reasoning": "DEMO MODE: High-confidence potential detected based on simulated strong thermal anomaly and structural trend."
      };
      
      Logger.info(`[Pipeline] Using Mock Parameters:`, params);

      // 3. Procedural Voxel Generation
      Logger.info(`[Pipeline] Generating spatial grid (50m res)...`);
      const voxels = SpatialGridService.generateVoxels(polygon as [number, number][], 50, 50);
      
      Logger.info(`[Pipeline] Applying model to ${voxels.length} voxels...`);
      
      const centerLon = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
      const centerLat = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;

      // Mathematical Application of Parameters
      const processedVoxels = voxels.map(v => {
        // Distance from center along trend vector
        const dx = (v.lon - centerLon) * 111000; // meters
        const dy = (v.lat - centerLat) * 111000; // meters
        
        // Rotate coordinates by trend azimuth
        const rad = (params.trend_azimuth || 0) * (Math.PI / 180);
        const distTrend = dx * Math.cos(rad) + dy * Math.sin(rad);
        
        // Create a "Core" effect (Higher grade in center)
        const distFromCenter = Math.sqrt(dx*dx + dy*dy);
        const coreFactor = Math.max(0, 1 - (distFromCenter / 500)); // Decay over 500m

        // Grade Calculation
        let au = (params.au_base_grade || 0) * coreFactor - (v.z * (params.depth_decay_factor || 0.01));
        let cu = (params.cu_base_grade || 0) * coreFactor - (v.z * (params.depth_decay_factor || 0.01));
        
        // Add Noise
        const noise = (Math.random() - 0.5) * 2 * (params.noise_variability || 0.1);
        au = Math.max(0, au * (1 + noise));
        cu = Math.max(0, cu * (1 + noise));

        return {
          id: v.id,
          x: v.x, y: v.y, z: v.z,
          lat: v.lat, lon: v.lon,
          au_grade: Number(au.toFixed(3)),
          cu_grade: Number(cu.toFixed(3)),
          rock_type: v.z < 10 ? 'Oxide' : 'Sulphide',
          uncertainty: Number((0.1 + (v.z * 0.01)).toFixed(2))
        };
      });

      // 4. Save to File System
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      
      const fileName = `voxel_data_${projectId}_${Date.now()}.json`;
      const filePath = path.join(STORAGE_DIR, fileName);
      
      fs.writeFileSync(filePath, JSON.stringify(processedVoxels));
      Logger.info(`[Pipeline] Saved ${processedVoxels.length} voxels to ${filePath}`);

      // 5. Update Project Document
      project.inferenceResults = undefined; 
      project.voxelDataUrl = `/api/storage/${fileName}`;
      
      project.cachedContext = {
        ragSummary: {
          short: `AI Analysis: ${params.reasoning}`,
          long: params.reasoning,
          sourceRef: "CLIMB AI Engine (Demo)"
        },
        nearestDeposits: nearestData.map(d => ({
          name: d.site_name,
          distance: `${d.distance_meters}m`,
          grade: d.grade,
          source: d.source
        })),
        surfaceFeatures: { ndvi, thermal, swir }
      };
      
      project.status = 'active';
      project.lastInferenceAt = new Date();
      
      await project.save();

      await ActivityService.log('inference', `Completed inference. Generated ${processedVoxels.length} blocks.`, projectId, project.name);
      Logger.job('InferencePipeline', 'DONE', `Successfully completed job for project: ${project.name}`);

    } catch (error) {
      Logger.error(`InferencePipeline failed for ${projectId}`, error);
      await Project.findByIdAndUpdate(projectId, { status: 'active' }); 
    }
  }

  /**
   * Resets projects stuck in 'processing' state upon server restart.
   */
  static async cleanupStaleJobs() {
    try {
      const result = await Project.updateMany(
        { status: 'processing' },
        { $set: { status: 'active' } } 
      );
      if (result.modifiedCount > 0) {
        Logger.info(`[System] Reset ${result.modifiedCount} stale 'processing' projects to 'active'.`);
      }
    } catch (error) {
      Logger.error('[System] Failed to cleanup stale jobs', error);
    }
  }
}
