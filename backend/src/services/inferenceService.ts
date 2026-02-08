import { generativeModel } from '../config/gcp';
import { RAGService } from './ragService';
import { SatelliteService } from './satelliteService';
import { ExternalDataService } from './externalDataService';
import { SpatialGridService, VoxelBatch } from './spatialGridService';
import type { Voxel } from './spatialGridService';
import { Project } from '../models/Project';
import * as turf from '@turf/turf';
import { ActivityService } from './activityService';
import { Logger } from '../utils/logger';

// Configuration
const PARALLEL_BATCH_CONCURRENCY = 20; // Max parallel Gemini calls

interface BatchResult {
  batchId: number;
  predictions: any[];
  surfaceFeatures: {
    ndvi: number;
    thermal: number;
    swir: number;
  };
}

interface SharedContext {
  ragSnippets: any[];
  nearestDeposits: any[];
  projectName: string;
  location: string;
  minerals: string[];
}

export class InferenceService {
  /**
   * Processes a single batch with its own geospatial context
   */
  private static async processBatch(
    batch: VoxelBatch,
    sharedContext: SharedContext
  ): Promise<BatchResult> {
    const { batchId, voxels, centroid } = batch;
    Logger.info(`[Pipeline] Processing batch ${batchId} (${voxels.length} voxels) at ${centroid.lat.toFixed(4)}, ${centroid.lon.toFixed(4)}`);

    try {
      // Get per-batch satellite data using batch's bounding box
      const batchGeojson = SpatialGridService.batchToGeoJSON(batch);

      const [ndvi, thermal, swir] = await Promise.all([
        SatelliteService.getNDVI(batchGeojson),
        SatelliteService.getThermalAnomaly(batchGeojson),
        SatelliteService.getSWIR(batchGeojson)
      ]);

      // Build batch-specific prompt with shared context + local geospatial
      const prompt = `
System: You are an expert Geostatistician AI.
Task: Estimate 3D mineral grade distribution for a specific sub-region.

SHARED CONTEXT (Global):
- Project: ${sharedContext.projectName}
- Location: ${sharedContext.location}
- Target Minerals: ${sharedContext.minerals.join(', ')}
- Nearby Deposits: ${JSON.stringify(sharedContext.nearestDeposits.slice(0, 3).map(d => ({
        name: d.site_name,
        status: d.metadata?.dev_stat || 'Unknown',
        grade_info: d.grade ? `${d.grade} ${d.unit}` : 'Qualitative'
      })))}
- Geological Reports: ${JSON.stringify(sharedContext.ragSnippets.slice(0, 2).map(r => r.content?.substring(0, 100) || ''))}

LOCAL CONTEXT (This Sub-region):
- Batch Center: ${centroid.lat.toFixed(6)}, ${centroid.lon.toFixed(6)}
- Surface NDVI: ${ndvi.toFixed(3)}
- Thermal: ${thermal.toFixed(2)}°C
- SWIR Ratio: ${swir.toFixed(3)}

VOXELS TO PREDICT: ${voxels.length}
Voxel IDs: ${voxels.slice(0, 10).map(v => v.id).join(', ')}${voxels.length > 10 ? '...' : ''}
Depth Range: 0-50m

OUTPUT FORMAT:
Return ONLY a JSON array: [{"id": "voxel_id", "au_grade": number, "cu_grade": number, "uncertainty": 0-1}]
Generate predictions for ALL ${voxels.length} voxel IDs.
`;

      const result = await generativeModel.generateContent(prompt);
      const response = result.response;
      const text = (response.candidates && response.candidates[0].content.parts[0].text) || (response as any).text();

      // Parse JSON response
      const jsonStr = text.replace(/```json|```/g, '').trim();
      let predictions: any[] = [];

      try {
        predictions = JSON.parse(jsonStr);
      } catch (e) {
        Logger.error(`[Pipeline] Batch ${batchId} JSON parse error`, e);
        // Fallback: generate empty predictions
        predictions = voxels.map(v => ({ id: v.id, au_grade: 0, cu_grade: 0, uncertainty: 1 }));
      }

      Logger.info(`[Pipeline] Batch ${batchId} completed with ${predictions.length} predictions`);

      return {
        batchId,
        predictions,
        surfaceFeatures: { ndvi, thermal, swir }
      };
    } catch (error) {
      Logger.error(`[Pipeline] Batch ${batchId} failed`, error);
      // Return empty predictions on error
      return {
        batchId,
        predictions: voxels.map(v => ({ id: v.id, au_grade: 0, cu_grade: 0, uncertainty: 1 })),
        surfaceFeatures: { ndvi: 0, thermal: 0, swir: 0 }
      };
    }
  }

  /**
   * Background Worker for Full Inference Pipeline with Parallel Batch Processing
   */
  static async runInferencePipeline(projectId: string) {
    Logger.job('InferencePipeline', 'START', `Starting background job for project: ${projectId}`);

    try {
      const project = await Project.findById(projectId);
      if (!project) throw new Error('Project not found');

      await ActivityService.log('inference', `Started inference pipeline for ${project.name}`, projectId, project.name);

      // =========================================
      // PHASE 1: Gather SHARED Context (once)
      // =========================================
      const polygon = project.aoi.coordinates[0];
      const geojson = { type: 'Polygon', coordinates: [polygon] };
      const centerPt = turf.center(geojson as any);
      const [lon, lat] = centerPt.geometry.coordinates;

      Logger.info(`[Pipeline] Phase 1: Gathering shared context for ${project.name}`);

      const [ragSnippets, nearestData] = await Promise.all([
        RAGService.searchKnowledge(`Geology and minerals near ${lat}, ${lon}`, 5),
        ExternalDataService.getNearestDeposits(lat, lon, 5)
      ]);

      const sharedContext: SharedContext = {
        ragSnippets,
        nearestDeposits: nearestData,
        projectName: project.name,
        location: project.location,
        minerals: project.minerals
      };

      Logger.info(`[Pipeline] Shared context loaded: ${ragSnippets.length} RAG snippets, ${nearestData.length} deposits`);

      // =========================================
      // PHASE 2: Voxelization & Batching
      // =========================================
      Logger.info(`[Pipeline] Phase 2: Generating spatial grid and batches`);

      const voxels = SpatialGridService.generateVoxels(polygon as [number, number][]);
      const batches = SpatialGridService.batchVoxels(voxels);

      Logger.info(`[Pipeline] Created ${batches.length} batches from ${voxels.length} voxels`);
      await ActivityService.log('inference', `Voxelization complete: ${voxels.length} voxels in ${batches.length} batches`, projectId, project.name);

      // =========================================
      // PHASE 3: Parallel Batch Processing
      // =========================================
      Logger.info(`[Pipeline] Phase 3: Starting ${batches.length} parallel inference jobs`);

      // Process all batches in parallel
      const batchPromises = batches.map(batch =>
        this.processBatch(batch, sharedContext)
      );

      const batchResults = await Promise.all(batchPromises);

      Logger.info(`[Pipeline] All ${batchResults.length} batches completed`);

      // =========================================
      // PHASE 4: Merge Results
      // =========================================
      Logger.info(`[Pipeline] Phase 4: Merging results`);

      // Flatten all predictions
      const allPredictions = batchResults.flatMap(r => r.predictions);

      // Calculate aggregate surface features (mean across batches)
      const avgNdvi = batchResults.reduce((sum, r) => sum + r.surfaceFeatures.ndvi, 0) / batchResults.length;
      const avgThermal = batchResults.reduce((sum, r) => sum + r.surfaceFeatures.thermal, 0) / batchResults.length;
      const avgSwir = batchResults.reduce((sum, r) => sum + r.surfaceFeatures.swir, 0) / batchResults.length;

      // Map predictions back to voxels
      const mergedVoxels = voxels.map(v => {
        const pred = allPredictions.find((p: any) => p.id === v.id) || { au_grade: 0, cu_grade: 0, uncertainty: 1 };
        return { ...v, ...pred };
      });

      // =========================================
      // PHASE 5: Save Results
      // =========================================
      project.inferenceResults = mergedVoxels;
      project.cachedContext = {
        ragSummary: {
          short: `AI analyzed ${batches.length} sub-regions with ${avgThermal > 2.0 ? 'elevated thermal signatures' : 'moderate surface indicators'}.`,
          long: `Parallel analysis of ${voxels.length} voxels across ${batches.length} batches. ${ragSnippets.length} geological reports and proximity to ${nearestData[0]?.site_name || 'historical sites'} informed predictions.`,
          sourceRef: "Hybrid Reasoning Engine v2 (Parallel)"
        },
        nearestDeposits: nearestData.map(d => ({
          name: d.site_name,
          distance: `${d.distance_meters?.toFixed(0)}m`,
          grade: d.grade ? `${d.grade} ${d.unit}` : (d.metadata?.dev_stat || 'Qualitative'),
          source: d.source
        })),
        surfaceFeatures: {
          ndvi: avgNdvi,
          thermal: avgThermal,
          swir: avgSwir
        },
        processingStats: {
          totalVoxels: voxels.length,
          batchCount: batches.length,
          voxelsPerBatch: batches[0]?.voxels.length || 0
        }
      };

      project.status = 'active';
      project.lastInferenceAt = new Date();
      await project.save();

      await ActivityService.log('inference', `Completed: ${voxels.length} voxels processed in ${batches.length} parallel jobs`, projectId, project.name);
      Logger.job('InferencePipeline', 'DONE', `Successfully completed job for project: ${project.name}`, {
        voxelCount: mergedVoxels.length,
        batchCount: batches.length
      });

    } catch (error) {
      Logger.error(`InferencePipeline failed for ${projectId}`, error);
      await Project.findByIdAndUpdate(projectId, { status: 'active' });
    }
  }

  /**
   * Orchestrates the hybrid inference process (Legacy single-batch mode)
   */
  static async predictGrade(projectName: string, polygon: [number, number][]): Promise<any> {
    try {
      Logger.job('PredictGrade', 'START', `Starting prediction for ${projectName}`);

      const geojson = { type: 'Polygon', coordinates: [polygon] };
      const ndvi = await SatelliteService.getNDVI(geojson);
      const thermal = await SatelliteService.getThermalAnomaly(geojson);
      Logger.info(`[PredictGrade] Satellite data fetched: NDVI=${ndvi}, Thermal=${thermal}`);

      const centerLon = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
      const centerLat = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;
      const ragSnippets = await RAGService.searchKnowledge(`Geology and minerals near ${centerLat}, ${centerLon}`, 3);
      const nearestData = await ExternalDataService.getNearestDeposits(centerLat, centerLon, 5);

      const voxels = SpatialGridService.generateVoxels(polygon);
      Logger.info(`[PredictGrade] Voxel grid generated: ${voxels.length} voxels`);

      const prompt = `
        System: You are an expert Geostatistician AI for the CLIMB system. 
        Task: Estimate 3D mineral grade distribution for a mining block AOI.
        
        Context:
        - Surface Vegetation (NDVI): ${ndvi}
        - Thermal Anomaly: ${thermal} Celsius
        - Nearest Historical Data (Kaggle): ${JSON.stringify(nearestData)}
        - Geological Reports Snippets: ${JSON.stringify(ragSnippets)}
        
        AOI Info:
        - Project: ${projectName}
        - Total Voxels to Estimate: ${voxels.length}
        - Depth Range: 0-50m
        
        Instructions:
        1. Based on the geological context, correlate surface anomalies and nearest historical data.
        2. Predict the grade of 'Gold (Au)' and 'Copper (Cu)' for each voxel.
        3. Return ONLY a JSON array of objects with the following format:
           [{"id": "voxel_id", "au_grade": number, "cu_grade": number, "reasoning": "short string"}]
        
        Respond only with the JSON array.
      `;

      Logger.info(`[PredictGrade] Calling Gemini 1.5 Pro...`);
      const result = await generativeModel.generateContent(prompt);
      const response = result.response;
      const text = (response.candidates && response.candidates[0].content.parts[0].text) || (response as any).text();

      const jsonString = text.replace(/```json|```/g, '').trim();
      const predictions = JSON.parse(jsonString);
      Logger.info(`[PredictGrade] Gemini returned ${predictions.length} predictions`);

      const finalVoxels = voxels.map(v => {
        const pred = predictions.find((p: any) => p.id === v.id) || { au_grade: 0, cu_grade: 0 };
        return { ...v, ...pred };
      });

      Logger.job('PredictGrade', 'DONE', `Completed prediction for ${projectName}`);
      return finalVoxels;

    } catch (error) {
      Logger.error('PredictGrade failed', error);
      throw error;
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
        ActivityService.log('system', `System startup: Reset ${result.modifiedCount} stale jobs.`);
      }
    } catch (error) {
      Logger.error('[System] Failed to cleanup stale jobs', error);
    }
  }
}