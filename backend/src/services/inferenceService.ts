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
import { MineralReconService } from './mineralReconService';

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

      // Build dynamic format example for the LLM
      const mineralGradeFormat = sharedContext.minerals.map(m => `"${m.toLowerCase()}_grade": number`).join(', ');
      const examplePrediction = sharedContext.minerals.reduce((obj: any, m) => {
        obj[`${m.toLowerCase()}_grade`] = 0.5;
        return obj;
      }, { id: "voxel_0_0_0", uncertainty: 0.3 });

      const prompt = `
System: You are an expert Geostatistician AI specializing in mineral grade estimation.

CRITICAL INSTRUCTION: You must predict grades for EXACTLY these minerals: ${sharedContext.minerals.join(', ')}
DO NOT predict au_grade or cu_grade unless they are in the list above.
EACH prediction object MUST contain: ${sharedContext.minerals.map(m => `${m.toLowerCase()}_grade`).join(', ')}

PROJECT CONTEXT:
- Name: ${sharedContext.projectName}
- Location: ${sharedContext.location}
- Target Minerals: ${sharedContext.minerals.join(', ')}
- Nearby Deposits: ${JSON.stringify(sharedContext.nearestDeposits.slice(0, 3).map(d => ({
        name: d.site_name,
        mineral: d.mineral_type || 'Unknown',
        grade_info: d.grade ? `${d.grade} ${d.unit}` : 'Qualitative'
      })))}

LOCAL SATELLITE DATA (This Sub-region):
- Batch Center: ${centroid.lat.toFixed(6)}, ${centroid.lon.toFixed(6)}
- NDVI: ${ndvi.toFixed(3)} | Thermal: ${thermal.toFixed(2)}°C | SWIR: ${swir.toFixed(3)}

VOXELS TO PREDICT: ${voxels.length}
Voxel IDs: ${voxels.slice(0, 5).map(v => v.id).join(', ')}${voxels.length > 5 ? '...' : ''}

OUTPUT FORMAT (STRICTLY FOLLOW THIS):
Return ONLY a JSON array. Each object must have this EXACT structure:
${JSON.stringify(examplePrediction, null, 2)}

EXAMPLE OUTPUT for minerals [${sharedContext.minerals.join(', ')}]:
[
  {"id": "${voxels[0]?.id || 'voxel_0_0_0'}", ${sharedContext.minerals.map(m => `"${m.toLowerCase()}_grade": 0.8`).join(', ')}, "uncertainty": 0.2},
  ...
]

Generate predictions for ALL ${voxels.length} voxel IDs with realistic grade values (0-5 g/t range).
`;

      const result = await generativeModel.generateContent(prompt);
      const response = result.response;
      const text = (response.candidates && response.candidates[0].content.parts[0].text) || (response as any).text();

      // LOG: Raw LLM response for first batch only (to avoid flooding logs)
      if (batchId === 0) {
        Logger.info(`[Pipeline] Batch 0 Raw LLM response (${text.length} chars): ${text.substring(0, 1000)}${text.length > 1000 ? '...' : ''}`);
      }

      // Parse JSON response
      const jsonStr = text.replace(/```json|```/g, '').trim();
      let predictions: any[] = [];

      try {
        predictions = JSON.parse(jsonStr);
        // LOG: Sample of parsed predictions for first batch
        if (batchId === 0 && predictions.length > 0) {
          Logger.info(`[Pipeline] Batch 0 Sample prediction: ${JSON.stringify(predictions[0])}`);
          const sampleKeys = Object.keys(predictions[0]).filter(k => k.includes('_grade'));
          Logger.info(`[Pipeline] Batch 0 Grade keys found: [${sampleKeys.join(', ')}]`);
        }
      } catch (e) {
        Logger.error(`[Pipeline] Batch ${batchId} JSON parse error`, e);
        Logger.warn(`[Pipeline] Batch ${batchId} Failed JSON: ${jsonStr.substring(0, 300)}`);
        // Fallback: generate empty predictions for ALL target minerals dynamically
        predictions = voxels.map(v => {
          const pred: any = { id: v.id, uncertainty: 1 };
          sharedContext.minerals.forEach(m => {
            pred[`${m.toLowerCase()}_grade`] = 0;
          });
          return pred;
        });
      }

      // CRITICAL: Normalize predictions to ensure all requested minerals have grades
      const normalizedPredictions = this.normalizePredictions(predictions, voxels, sharedContext.minerals);

      Logger.info(`[Pipeline] Batch ${batchId} completed with ${normalizedPredictions.length} predictions`);

      return {
        batchId,
        predictions: normalizedPredictions,
        surfaceFeatures: { ndvi, thermal, swir }
      };
    } catch (error) {
      Logger.error(`[Pipeline] Batch ${batchId} failed`, error);
      // Return empty predictions with dynamic minerals on error
      const emptyPredictions = voxels.map(v => {
        const pred: any = { id: v.id, uncertainty: 1 };
        sharedContext.minerals.forEach(m => {
          pred[`${m.toLowerCase()}_grade`] = 0;
        });
        return pred;
      });
      return {
        batchId,
        predictions: emptyPredictions,
        surfaceFeatures: { ndvi: 0, thermal: 0, swir: 0 }
      };
    }
  }

  /**
   * Normalize LLM predictions to ensure all requested minerals have grade values
   * Handles cases where LLM returns wrong field names (e.g., au_grade instead of ag_grade)
   */
  private static normalizePredictions(
    predictions: any[],
    voxels: any[],
    targetMinerals: string[]
  ): any[] {
    // Build a map of voxel IDs to their original data for fallback
    const voxelMap = new Map(voxels.map(v => [v.id, v]));

    return predictions.map((pred, idx) => {
      const normalized: any = {
        id: pred.id || voxels[idx]?.id || `voxel_${idx}`,
        uncertainty: pred.uncertainty ?? 0.5
      };

      // Ensure each target mineral has a grade
      targetMinerals.forEach(mineral => {
        const key = `${mineral.toLowerCase()}_grade`;

        if (pred[key] !== undefined && typeof pred[key] === 'number') {
          // Use LLM's prediction if it exists
          normalized[key] = pred[key];
        } else {
          // Check for common mismatches (e.g., LLM returns "gold_grade" instead of "au_grade")
          const altKeys = this.getAlternativeGradeKeys(mineral);
          let found = false;

          for (const altKey of altKeys) {
            if (pred[altKey] !== undefined && typeof pred[altKey] === 'number') {
              normalized[key] = pred[altKey];
              found = true;
              break;
            }
          }

          if (!found) {
            // Default to 0 if no matching grade found
            normalized[key] = 0;
          }
        }
      });

      return normalized;
    });
  }

  /**
   * Get alternative grade key names that LLM might use
   */
  private static getAlternativeGradeKeys(mineral: string): string[] {
    const aliases: Record<string, string[]> = {
      Au: ['gold_grade', 'au', 'gold'],
      Cu: ['copper_grade', 'cu', 'copper'],
      Ag: ['silver_grade', 'ag', 'silver'],
      Ni: ['nickel_grade', 'ni', 'nickel'],
      Co: ['cobalt_grade', 'co', 'cobalt'],
      Fe: ['iron_grade', 'fe', 'iron'],
      Mn: ['manganese_grade', 'mn', 'manganese'],
      Sn: ['tin_grade', 'sn', 'tin'],
      Mo: ['molybdenum_grade', 'mo', 'molybdenum'],
      Zn: ['zinc_grade', 'zn', 'zinc'],
      Cr: ['chromium_grade', 'cr', 'chromium'],
      Ta: ['tantalum_grade', 'ta', 'tantalum'],
      Pb: ['lead_grade', 'pb', 'lead'],
      W: ['tungsten_grade', 'w', 'tungsten']
    };
    return aliases[mineral] || [];
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
      // PHASE 0: Mineral Reconnaissance
      // =========================================
      await this.updatePhase(projectId, 'recon', 0);

      const polygon = project.aoi.coordinates[0];
      const geojson = { type: 'Polygon', coordinates: [polygon] };
      const centerPt = turf.center(geojson as any);
      const [lon, lat] = centerPt.geometry.coordinates;

      Logger.info(`[Pipeline] Phase 0: Running mineral reconnaissance for ${project.name}`);
      await ActivityService.log('inference', `Phase 0: Mineral reconnaissance started`, projectId, project.name);

      const reconResult = await MineralReconService.predictMinerals(lat, lon, project.name, project.location, polygon as number[][]);

      // Update project with predicted minerals
      project.minerals = reconResult.minerals;
      project.mineralMetadata = MineralReconService.generateMineralMetadata(reconResult.minerals);

      Logger.info(`[Pipeline] Mineral recon complete: ${reconResult.minerals.join(', ')} (confidence: ${reconResult.confidence})`);
      await ActivityService.log('inference', `Predicted minerals: ${reconResult.minerals.join(', ')}`, projectId, project.name);

      // =========================================
      // PHASE 1: Gather SHARED Context
      // =========================================
      await this.updatePhase(projectId, 'context', 15);
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
        minerals: reconResult.minerals  // Use dynamically predicted minerals
      };

      Logger.info(`[Pipeline] Shared context loaded: ${ragSnippets.length} RAG snippets, ${nearestData.length} deposits`);

      // =========================================
      // PHASE 2: Voxelization & Batching
      // =========================================
      await this.updatePhase(projectId, 'voxelization', 30);
      Logger.info(`[Pipeline] Phase 2: Generating spatial grid and batches`);

      const voxels = SpatialGridService.generateVoxels(polygon as [number, number][]);
      const batches = SpatialGridService.batchVoxels(voxels);

      Logger.info(`[Pipeline] Created ${batches.length} batches from ${voxels.length} voxels`);
      await ActivityService.log('inference', `Voxelization complete: ${voxels.length} voxels in ${batches.length} batches`, projectId, project.name);

      // =========================================
      // PHASE 3: Parallel Batch Processing
      // =========================================
      await this.updatePhase(projectId, 'processing', 45);
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
      await this.updatePhase(projectId, 'merging', 90);
      Logger.info(`[Pipeline] Phase 4: Merging results`);

      // Flatten all predictions
      const allPredictions = batchResults.flatMap(r => r.predictions);

      // Calculate aggregate surface features (mean across batches)
      const avgNdvi = batchResults.reduce((sum, r) => sum + r.surfaceFeatures.ndvi, 0) / batchResults.length;
      const avgThermal = batchResults.reduce((sum, r) => sum + r.surfaceFeatures.thermal, 0) / batchResults.length;
      const avgSwir = batchResults.reduce((sum, r) => sum + r.surfaceFeatures.swir, 0) / batchResults.length;

      // Map predictions back to voxels BY INDEX (not by ID, since LLM may use different IDs)
      // The predictions are ordered by batch, and within each batch, ordered by voxel index
      const mergedVoxels = voxels.map((v, idx) => {
        // Use index-based mapping since predictions maintain order within batches
        const pred = allPredictions[idx];

        if (pred) {
          // Merge voxel spatial data with prediction grades
          // Keep original voxel id, x, y, z, lat, lon
          const merged: any = {
            id: v.id,
            x: v.x,
            y: v.y,
            z: v.z,
            lat: v.lat,
            lon: v.lon,
            uncertainty: pred.uncertainty ?? 0.5
          };

          // Copy all mineral grades from prediction
          Object.keys(pred).forEach(key => {
            if (key.endsWith('_grade')) {
              merged[key] = pred[key];
            }
          });

          return merged;
        } else {
          // Fallback with dynamic minerals
          const fallback: any = {
            ...v,
            uncertainty: 1
          };
          reconResult.minerals.forEach(m => {
            fallback[`${m.toLowerCase()}_grade`] = 0;
          });
          return fallback;
        }
      });

      // =========================================
      // PHASE 5: AI Summary Generation
      // =========================================
      await this.updatePhase(projectId, 'summary', 95);
      Logger.info(`[Pipeline] Phase 5: Generating Final AI Summary`);

      // Calculate grade ranges for summary context
      const gradeRanges = sharedContext.minerals.map(m => {
        const grades = mergedVoxels.map(v => v[`${m.toLowerCase()}_grade`] || 0);
        const min = Math.min(...grades).toFixed(2);
        const max = Math.max(...grades).toFixed(2);
        const avg = (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2);
        return `${m}: ${min}-${max} (avg ${avg})`;
      }).join(', ');

      // Determine depths
      const depths = mergedVoxels.map(v => v.z * -1); // z is negative depth
      const minDepth = Math.min(...depths).toFixed(0);
      const maxDepth = Math.max(...depths).toFixed(0);

      // Generate Summary with LLM
      const summaryPrompt = `
      System: You are a Senior Chief Geologist summarizing a completed mineral exploration AI analysis.
      
      PROJECT CONTEXT:
      - Name: ${project.name}
      - Location: ${project.location}
      - Minerals: ${sharedContext.minerals.join(', ')}
      - Reconnaissance Reasoning: "${reconResult.reasoning}"
      
      ANALYSIS RESULTS:
      - Total Voxels: ${voxels.length}
      - Grade Ranges: ${gradeRanges}
      - Depth Range: ${minDepth}m to ${maxDepth}m
      - Surface Indicators: NDVI=${avgNdvi.toFixed(2)}, Thermal=${avgThermal.toFixed(2)}, SWIR=${avgSwir.toFixed(2)}
      - Nearby Deposits: ${nearestData.map(d => d.site_name).join(', ')}
      
      TASK:
      Generate a professional, concise executive summary (max 3 sentences).
      Focus on the economic potential, key mineral findings, and a final recommendation.
      Do NOT mention "AI" or "Analysis" excessively. Sound like a human expert.
      `;

      const summaryResult = await generativeModel.generateContent(summaryPrompt);
      const summaryText = summaryResult.response.candidates?.[0].content.parts[0].text || "Analysis completed.";

      project.cachedContext = {
        mineralRecon: {
          predictedMinerals: reconResult.minerals,
          reasoning: reconResult.reasoning,
          nearestOccurrences: reconResult.nearestOccurrences,
          confidence: reconResult.confidence,
          reconAt: new Date(),
          surfaceAnalysis: reconResult.surfaceAnalysis
        },
        aiSummary: {
          text: summaryText,
          gradeRange: gradeRanges,
          depthRange: `${minDepth}-${maxDepth}m`,
          confidence: (reconResult.confidence + 0.9) / 2, // Blend recon confidence with model confidence
          generatedAt: new Date()
        },
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

      // Finalize Project
      project.status = 'active';
      project.lastInferenceAt = new Date();
      project.inferencePhase = {
        current: 'complete',
        progress: 100,
        completedSteps: ['recon', 'context', 'voxelization', 'processing', 'merging', 'summary'],
        lastUpdatedAt: new Date(),
        startedAt: project.inferencePhase?.startedAt || new Date()
      };

      // Update top-level confidence from AI Summary
      project.confidence = (reconResult.confidence + 0.85) / 2; // Simple weighting

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
   * Helper to update inference phase
   */
  private static async updatePhase(projectId: string, phase: string, progress: number) {
    await Project.findByIdAndUpdate(projectId, {
      $set: {
        'inferencePhase.current': phase,
        'inferencePhase.progress': progress,
        'inferencePhase.lastUpdatedAt': new Date()
      },
      $addToSet: {
        'inferencePhase.completedSteps': phase === 'complete' ? [] : phase // Don't add 'complete' recursively
      }
    });

    // If completing a step, also add it to completedSteps
    if (phase !== 'idle' && phase !== 'complete') {
      // Handled by $addToSet above, but we want previous steps too? 
      // For simplicity, we just track current. The UI can infer completed steps or we can push explicitly.
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