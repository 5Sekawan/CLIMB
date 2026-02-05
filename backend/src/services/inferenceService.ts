import { generativeModel } from '../config/gcp';
import { RAGService } from './ragService';
import { SatelliteService } from './satelliteService';
import { ExternalDataService } from './externalDataService';
import { SpatialGridService } from './spatialGridService';
import type { Voxel } from './spatialGridService';

export class InferenceService {
  /**
   * Orchestrates the hybrid inference process
   */
  static async predictGrade(projectName: string, polygon: [number, number][]): Promise<any> {
    try {
      // 1. Get Surface Context (GEE)
      const geojson = {
        type: 'Polygon',
        coordinates: [polygon]
      };
      const ndvi = await SatelliteService.getNDVI(geojson);
      const thermal = await SatelliteService.getThermalAnomaly(geojson);

      // 2. Get Knowledge Context (RAG)
      const centerLon = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
      const centerLat = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;
      const ragSnippets = await RAGService.searchKnowledge(`Geology and minerals near ${centerLat}, ${centerLon}`, 3);

      // 3. Get External Data Context (Kaggle)
      const nearestData = await ExternalDataService.getNearestDeposits(centerLat, centerLon, 5);

      // 4. Generate Voxel Grid
      const voxels = SpatialGridService.generateVoxels(polygon);

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
      const result = await generativeModel.generateContent(prompt);
      const response = result.response;
      // Using candidates directly or casting to any to handle type mismatch
      const text = (response.candidates && response.candidates[0].content.parts[0].text) || (response as any).text();
      
      // Clean and Parse JSON
      const jsonString = text.replace(/```json|```/g, '').trim();
      const predictions = JSON.parse(jsonString);

      // 7. Map Predictions back to Voxels
      return voxels.map(v => {
        const pred = predictions.find((p: any) => p.id === v.id) || { au_grade: 0, cu_grade: 0 };
        return { ...v, ...pred };
      });

    } catch (error) {
      console.error('Inference error:', error);
      throw error;
    }
  }
}