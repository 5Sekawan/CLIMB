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
   * Background Worker for Full Inference Pipeline (Parametric V3.0)
   */
  static async runInferencePipeline(projectId: string) {
    Logger.job('InferencePipeline', 'START', `Starting background job for project: ${projectId}`);
    
    try {
      const project = await Project.findById(projectId);
      if (!project) throw new Error('Project not found');

      await ActivityService.log('inference', `Started inference pipeline for ${project.name}`, projectId, project.name);

      // 1. Context Gathering
      const polygon = project.aoi.coordinates[0]; // GeoJSON format
      
      // GEE (Satellite)
      const geojson = { type: 'Polygon', coordinates: [polygon] };
      Logger.info(`[Pipeline] Fetching Satellite context for ${project.name}`);
      const [ndvi, thermal, swir] = await Promise.all([
        SatelliteService.getNDVI(geojson),
        SatelliteService.getThermalAnomaly(geojson),
        SatelliteService.getSWIR(geojson)
      ]);

      // RAG & External Data
      const centerPt = turf.center(geojson as any);
      const [lon, lat] = centerPt.geometry.coordinates;
      
      Logger.info(`[Pipeline] Querying RAG and External data near ${lat}, ${lon}`);
      const [ragSnippets, nearestData] = await Promise.all([
        RAGService.searchKnowledge(`Geology and minerals near ${lat}, ${lon}`, 3),
        ExternalDataService.getNearestDeposits(lat, lon, 5)
      ]);

      // 2. AI Parameter Generation (Reasoning)
      const prompt = `
        System: You are an expert Geostatistician AI.
        Task: Define a 3D Grade Distribution Model (Mathematical Parameters) for a mining block.
        
        Context:
        - Location: ${project.location}
        - Surface: NDVI=${ndvi.toFixed(2)}, Thermal=${thermal.toFixed(2)}C, SWIR_Ratio=${swir.toFixed(2)}
        - Nearby Deposits: ${JSON.stringify(nearestData.map(d => ({ 
            name: d.site_name, 
            status: d.metadata?.dev_stat || 'Unknown', 
            grade_proxy: d.grade ? `${d.grade}` : 'Qualitative'
          })))}
        - Geological Reports: ${JSON.stringify(ragSnippets.map(r => r.content.substring(0, 100)))}
        
        Target Minerals: ${project.minerals.join(', ')}.
        
        Instructions:
        Instead of listing voxels, define the statistical parameters for the grade distribution.
        If data is weak, use conservative estimates.
        
        Output ONLY valid JSON:
        {
          "au_base_grade": number (g/t, e.g., 0.5 - 5.0),
          "cu_base_grade": number (%, e.g., 0.1 - 2.0),
          "trend_azimuth": number (0-360 degrees direction of mineralization),
          "trend_dip": number (0-90 degrees dip),
          "depth_decay_factor": number (0.0 - 0.1, grade loss per meter depth),
          "noise_variability": number (0.0 - 0.5, randomness factor),
          "reasoning": "string"
        }
      `;

      Logger.info(`[Pipeline] Requesting Gemini parameters...`);
      const result = await generativeModel.generateContent(prompt);
      const response = result.response;
      const text = (response.candidates && response.candidates[0].content.parts[0].text) || (response as any).text();
      
      const jsonStr = text.replace(/```json|```/g, '').trim();
      const params = JSON.parse(jsonStr);
      Logger.info(`[Pipeline] Gemini Parameters:`, params);

      // 3. Procedural Voxel Generation
      // Optimization: Increase voxel size to 10m to reduce object count by 4x-8x
      Logger.info(`[Pipeline] Generating spatial grid (10m res)...`);
      const voxels = SpatialGridService.generateVoxels(polygon as [number, number][], 50, 10);
      
      Logger.info(`[Pipeline] Applying model to ${voxels.length} voxels...`);
      
      const centerLon = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
      const centerLat = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;

      // Mathematical Application of AI Parameters
      const processedVoxels = voxels.map(v => {
        // Distance from center along trend vector
        const dx = (v.lon - centerLon) * 111000; // meters
        const dy = (v.lat - centerLat) * 111000; // meters
        
        // Rotate coordinates by trend azimuth
        const rad = (params.trend_azimuth || 0) * (Math.PI / 180);
        const distTrend = dx * Math.cos(rad) + dy * Math.sin(rad);
        
        // Grade Calculation
        // Grade = Base + Trend - DepthDecay + Noise
        // Simplified Logic:
        let au = (params.au_base_grade || 0) + (distTrend * 0.0001) - (v.z * (params.depth_decay_factor || 0.01));
        let cu = (params.cu_base_grade || 0) + (distTrend * 0.00005) - (v.z * (params.depth_decay_factor || 0.01));
        
        // Add Noise
        const noise = (Math.random() - 0.5) * 2 * (params.noise_variability || 0.1);
        au = Math.max(0, au * (1 + noise));
        cu = Math.max(0, cu * (1 + noise));

        // Thermal Boost (Heuristic)
        if (thermal > 2.0) {
          au *= 1.1; // 10% boost for high thermal
        }

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

      // 4. Save to File System (Avoiding MongoDB 16MB Limit)
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      
      const fileName = `voxel_data_${projectId}_${Date.now()}.json`;
      const filePath = path.join(STORAGE_DIR, fileName);
      
      fs.writeFileSync(filePath, JSON.stringify(processedVoxels));
      Logger.info(`[Pipeline] Saved ${processedVoxels.length} voxels to ${filePath}`);

      // 5. Update Project Document
      // Clear legacy inferenceResults if any to free up DB space
      project.inferenceResults = undefined; 
      project.voxelDataUrl = `/api/storage/${fileName}`; // Public URL path
      
      project.cachedContext = {
        ragSummary: {
          short: `AI Parametric Model: ${params.reasoning.substring(0, 100)}...`,
          long: params.reasoning,
          sourceRef: "Gemini 1.5 Pro Parametric Engine"
        },
        nearestDeposits: nearestData.map(d => ({
          name: d.site_name,
          distance: `${d.distance_meters?.toFixed(0)}m`,
          grade: d.grade ? `${d.grade} ${d.unit}` : 'Qualitative',
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
      // Revert status on error
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
