"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InferenceService = void 0;
const gcp_1 = require("../config/gcp");
const ragService_1 = require("./ragService");
const satelliteService_1 = require("./satelliteService");
const externalDataService_1 = require("./externalDataService");
const spatialGridService_1 = require("./spatialGridService");
class InferenceService {
    /**
     * Orchestrates the hybrid inference process
     */
    static async predictGrade(projectName, polygon) {
        try {
            // 1. Get Surface Context (GEE)
            const geojson = {
                type: 'Polygon',
                coordinates: [polygon]
            };
            const ndvi = await satelliteService_1.SatelliteService.getNDVI(geojson);
            const thermal = await satelliteService_1.SatelliteService.getThermalAnomaly(geojson);
            // 2. Get Knowledge Context (RAG)
            const centerLon = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
            const centerLat = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;
            const ragSnippets = await ragService_1.RAGService.searchKnowledge(`Geology and minerals near ${centerLat}, ${centerLon}`, 3);
            // 3. Get External Data Context (Kaggle)
            const nearestData = await externalDataService_1.ExternalDataService.getNearestDeposits(centerLat, centerLon, 5);
            // 4. Generate Voxel Grid
            const voxels = spatialGridService_1.SpatialGridService.generateVoxels(polygon);
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
            const result = await gcp_1.generativeModel.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            // Clean and Parse JSON
            const jsonString = text.replace(/```json|```/g, '').trim();
            const predictions = JSON.parse(jsonString);
            // 7. Map Predictions back to Voxels
            return voxels.map(v => {
                const pred = predictions.find((p) => p.id === v.id) || { au_grade: 0, cu_grade: 0 };
                return { ...v, ...pred };
            });
        }
        catch (error) {
            console.error('Inference error:', error);
            throw error;
        }
    }
}
exports.InferenceService = InferenceService;
//# sourceMappingURL=inferenceService.js.map