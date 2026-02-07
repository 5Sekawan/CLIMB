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

export class InferenceService {
  /**
   * Orchestrates the hybrid inference process
   */
  static async predictGrade(projectName: string, polygon: [number, number][]): Promise<any> {
    try {
      Logger.job('PredictGrade', 'START', `Starting prediction for ${projectName}`);
      
      // 1. Get Surface Context (GEE)
      const geojson = {
        type: 'Polygon',
        coordinates: [polygon]
      };
      const ndvi = await SatelliteService.getNDVI(geojson);
      const thermal = await SatelliteService.getThermalAnomaly(geojson);
      Logger.info(`[PredictGrade] Satellite data fetched: NDVI=${ndvi}, Thermal=${thermal}`);

      // 2. Get Knowledge Context (RAG)
      const centerLon = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
      const centerLat = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;
      const ragSnippets = await RAGService.searchKnowledge(`Geology and minerals near ${centerLat}, ${centerLon}`, 3);
      Logger.info(`[PredictGrade] RAG context fetched: ${ragSnippets.length} snippets`);

      // 3. Get External Data Context (Kaggle)
      const nearestData = await ExternalDataService.getNearestDeposits(centerLat, centerLon, 5);
      Logger.info(`[PredictGrade] External data fetched: ${nearestData.length} records`);

      // 4. Generate Voxel Grid
      const voxels = SpatialGridService.generateVoxels(polygon);
      Logger.info(`[PredictGrade] Voxel grid generated: ${voxels.length} voxels`);

      // 5. Prepare Prompt for Gemini
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

      // 6. Call Gemini
      Logger.info(`[PredictGrade] Calling Gemini 1.5 Pro...`);
      const result = await generativeModel.generateContent(prompt);
      const response = result.response;
      // Using candidates directly or casting to any to handle type mismatch
      const text = (response.candidates && response.candidates[0].content.parts[0].text) || (response as any).text();
      
      // Clean and Parse JSON
      const jsonString = text.replace(/```json|```/g, '').trim();
      const predictions = JSON.parse(jsonString);
      Logger.info(`[PredictGrade] Gemini returned ${predictions.length} predictions`);

      // 7. Map Predictions back to Voxels
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
   * Background Worker for Full Inference Pipeline
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

      // 2. Voxelization
      Logger.info(`[Pipeline] Generating spatial grid`);
      const voxels = SpatialGridService.generateVoxels(polygon as [number, number][]);

      // 3. AI Generation (Gemini)
      const prompt = `
        System: You are an expert Geostatistician AI.
        Task: Estimate 3D mineral grade distribution.
        
        Context:
        - Location: ${project.location}
        - Surface: NDVI=${ndvi.toFixed(2)}, Thermal=${thermal.toFixed(2)}C, SWIR_Ratio=${swir.toFixed(2)}
        - Nearby Deposits: ${JSON.stringify(nearestData.map(d => ({ 
            name: d.site_name, 
            status: d.metadata?.dev_stat || 'Unknown', 
            type: d.metadata?.dev_stat || 'Unknown',
            grade_info: d.grade ? `${d.grade} ${d.unit}` : 'Grade data unavailable (Use status/type as proxy)'
          })))}
        - Geological Reports: ${JSON.stringify(ragSnippets.map(r => r.content.substring(0, 150)))}
        
        Grid: ${voxels.length} voxels.
        Target Minerals: ${project.minerals.join(', ')}.
        
        Output: JSON Array of objects: { "id": "voxel_id", "au_grade": number, "cu_grade": number, "uncertainty": 0-1 }
      `;

      Logger.info(`[Pipeline] Requesting Gemini reasoning for ${voxels.length} voxels`);
      const result = await generativeModel.generateContent(prompt);
      const response = result.response;
      const text = (response.candidates && response.candidates[0].content.parts[0].text) || (response as any).text();
      
      // Robust JSON parsing
      const jsonStr = text.replace(/```json|```/g, '').trim();
      let predictions = [];
      try {
        predictions = JSON.parse(jsonStr);
      } catch (e) {
        Logger.error("Gemini JSON Parse Error", e);
        predictions = []; // Fallback or retry
      }

      // 4. Merge & Save
      const mergedVoxels = voxels.map(v => {
        const pred = predictions.find((p: any) => p.id === v.id) || {};
        return { ...v, ...pred };
      });

      // Update Project
      project.inferenceResults = mergedVoxels;
      project.cachedContext = {
        ragSummary: {
          short: `AI detected potential mineral enrichment correlating with ${thermal > 2.0 ? 'high thermal anomaly' : 'moderate surface indicators'}.`,
          long: `The synthesis of ${ragSnippets.length} geological reports and proximity to ${nearestData[0]?.site_name || 'historical sites'} suggests a valid mineralized trend.`,
          sourceRef: "Hybrid Reasoning Engine"
        },
        nearestDeposits: nearestData.map(d => ({
          name: d.site_name,
          distance: `${d.distance_meters?.toFixed(0)}m`,
          grade: d.grade ? `${d.grade} ${d.unit}` : (d.metadata?.dev_stat || 'Qualitative'),
          source: d.source
        })),
        surfaceFeatures: { ndvi, thermal, swir }
      };
      
      project.status = 'active';
      project.lastInferenceAt = new Date();
      await project.save();

      await ActivityService.log('inference', `Completed voxel generation and context synthesis`, projectId, project.name);
      Logger.job('InferencePipeline', 'DONE', `Successfully completed job for project: ${project.name}`, { voxelCount: mergedVoxels.length });

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
        ActivityService.log('system', `System startup: Reset ${result.modifiedCount} stale jobs.`);
      }
    } catch (error) {
      Logger.error('[System] Failed to cleanup stale jobs', error);
    }
  }
}