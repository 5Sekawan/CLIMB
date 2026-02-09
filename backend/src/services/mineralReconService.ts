/**
 * Mineral Reconnaissance Service
 * 
 * Phase 0 of the inference pipeline: Uses LLM to perform comprehensive
 * geological analysis based on RAG documents, nearby deposits, and satellite data.
 */

import { generativeModel } from '../config/gcp';
import { RAGService } from './ragService';
import { ExternalDataService } from './externalDataService';
import { SatelliteService } from './satelliteService';
import { Logger } from '../utils/logger';

export interface MineralReconResult {
    minerals: string[];           // Predicted mineral symbols: ["Au", "Cu", "Ag"]
    reasoning: string;            // Comprehensive geological analysis
    nearestOccurrences: string[]; // Names of nearby known deposits
    confidence: number;           // 0-1 confidence score
    surfaceAnalysis?: {           // Satellite data summary
        ndvi: number;
        thermal: number;
        swir: number;
        interpretation: string;
    };
}

// Mineral metadata for UI display
const MINERAL_INFO: Record<string, { label: string; color: string }> = {
    Au: { label: 'Gold (Au)', color: 'bg-amber-400' },
    Cu: { label: 'Copper (Cu)', color: 'bg-orange-500' },
    Ag: { label: 'Silver (Ag)', color: 'bg-slate-400' },
    Ni: { label: 'Nickel (Ni)', color: 'bg-teal-500' },
    Co: { label: 'Cobalt (Co)', color: 'bg-blue-500' },
    Fe: { label: 'Iron (Fe)', color: 'bg-red-500' },
    Mn: { label: 'Manganese (Mn)', color: 'bg-purple-500' },
    Sn: { label: 'Tin (Sn)', color: 'bg-gray-400' },
    Mo: { label: 'Molybdenum (Mo)', color: 'bg-violet-500' },
    Zn: { label: 'Zinc (Zn)', color: 'bg-zinc-400' },
    Cr: { label: 'Chromium (Cr)', color: 'bg-emerald-600' },
    Ta: { label: 'Tantalum (Ta)', color: 'bg-indigo-500' },
    Pb: { label: 'Lead (Pb)', color: 'bg-gray-600' },
    W: { label: 'Tungsten (W)', color: 'bg-stone-500' },
};

// Map common mineral names to symbols
const MINERAL_NAME_TO_SYMBOL: Record<string, string> = {
    'gold': 'Au',
    'copper': 'Cu',
    'silver': 'Ag',
    'nickel': 'Ni',
    'cobalt': 'Co',
    'iron': 'Fe',
    'manganese': 'Mn',
    'tin': 'Sn',
    'molybdenum': 'Mo',
    'zinc': 'Zn',
    'chromium': 'Cr',
    'tantalum': 'Ta',
    'lead': 'Pb',
    'tungsten': 'W',
};

export class MineralReconService {
    /**
     * Comprehensive geological analysis and mineral prediction
     * Aggregates: RAG documents + nearby deposits + satellite data (GEE)
     */
    static async predictMinerals(
        lat: number,
        lon: number,
        projectName: string,
        location: string,
        aoiPolygon?: number[][]
    ): Promise<MineralReconResult> {
        Logger.info(`[MineralRecon] Starting comprehensive reconnaissance for ${projectName}`);

        try {
            // Create simple bounding box for satellite queries if polygon provided
            const geojson = aoiPolygon
                ? { type: 'Polygon', coordinates: [aoiPolygon] }
                : { type: 'Point', coordinates: [lon, lat] };

            // Gather ALL context in parallel: RAG + Deposits + Satellite
            const [ragSnippets, nearestDeposits, ndvi, thermal, swir] = await Promise.all([
                RAGService.searchKnowledge(`Geology and mineral deposits near ${lat}, ${lon} ${location}`, 5),
                ExternalDataService.getNearestDeposits(lat, lon, 10),
                SatelliteService.getNDVI(geojson).catch(() => 0),
                SatelliteService.getThermalAnomaly(geojson).catch(() => 0),
                SatelliteService.getSWIR(geojson).catch(() => 0)
            ]);

            Logger.info(`[MineralRecon] Context gathered: ${ragSnippets.length} RAG, ${nearestDeposits.length} deposits, satellite OK`);

            // Extract mineral types from nearby deposits
            const nearbyMinerals = nearestDeposits
                .map((d: any) => d.mineral_type)
                .filter(Boolean);

            const nearestOccurrences = nearestDeposits
                .slice(0, 5)
                .map((d: any) => d.site_name)
                .filter(Boolean);

            // Interpret satellite data
            const surfaceInterpretation = this.interpretSatelliteData(ndvi, thermal, swir);

            // Build comprehensive LLM prompt
            const prompt = `
System: You are an Expert Geological Intelligence AI. Provide a COMPREHENSIVE analysis of this exploration project.

PROJECT DETAILS:
- Name: ${projectName}
- Location: ${location}
- Coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}

=== DATA SOURCE 1: GEOLOGICAL DOCUMENTS (RAG) ===
${ragSnippets.length > 0
                    ? ragSnippets.slice(0, 3).map((r: any, i: number) => `[Doc ${i + 1}]: ${r.content?.substring(0, 300) || 'No content available'}`).join('\n\n')
                    : 'No geological documents available for this region.'}

=== DATA SOURCE 2: NEARBY MINERAL DEPOSITS (BigQuery) ===
${nearestDeposits.length > 0
                    ? nearestDeposits.slice(0, 5).map((d: any) =>
                        `- ${d.site_name}: ${d.mineral_type || 'Unknown'} | Status: ${d.metadata?.dev_stat || 'Unknown'} | Distance: ${(d.distance_meters / 1000).toFixed(1)}km | Deposit Type: ${d.metadata?.dep_type || 'Unknown'}`
                    ).join('\n')
                    : 'No nearby deposits found in database.'}

Regional Minerals: ${[...new Set(nearbyMinerals)].join(', ') || 'Unknown'}

=== DATA SOURCE 3: SATELLITE IMAGERY (Google Earth Engine) ===
- NDVI (Vegetation): ${ndvi.toFixed(3)} ${ndvi > 0.3 ? '(Dense vegetation)' : ndvi > 0.1 ? '(Moderate)' : '(Sparse/Bare)'}
- Thermal Anomaly: ${thermal.toFixed(2)}°C ${thermal > 2 ? '(Elevated - possible hydrothermal)' : '(Normal)'}
- SWIR Ratio: ${swir.toFixed(3)} ${swir > 1.5 ? '(High - possible alteration)' : '(Normal)'}
- Satellite Interpretation: ${surfaceInterpretation}

=== YOUR TASK ===
Provide a COMPREHENSIVE geological analysis that includes:
1. Regional geological context from documents
2. Nearby deposit patterns and mineralization styles
3. Surface anomaly interpretation from satellite data
4. Target mineral recommendations (TOP 3-5 most likely minerals)
5. Overall exploration potential assessment

OUTPUT FORMAT (JSON only, no markdown):
{
  "minerals": ["Au", "Cu", "Ag"],
  "reasoning": "Your comprehensive 2-3 paragraph geological analysis here covering ALL data sources...",
  "confidence": 0.85
}
`;

            const result = await generativeModel.generateContent(prompt);
            const response = result.response;
            const text = (response.candidates && response.candidates[0].content.parts[0].text) || (response as any).text();

            // Parse JSON response
            const jsonStr = text.replace(/```json|```/g, '').trim();
            let parsed: any;

            try {
                parsed = JSON.parse(jsonStr);
            } catch (e) {
                Logger.error('[MineralRecon] JSON parse error, using fallback', e);
                parsed = this.fallbackPrediction(nearbyMinerals, nearestOccurrences, surfaceInterpretation);
            }

            // Validate and normalize minerals
            const validMinerals = this.normalizeMinerals(parsed.minerals || []);
            if (validMinerals.length === 0) {
                validMinerals.push('Au', 'Cu');
            }

            const reconResult: MineralReconResult = {
                minerals: validMinerals,
                reasoning: parsed.reasoning || 'Based on regional geological context and nearby mineral occurrences.',
                nearestOccurrences,
                confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
                surfaceAnalysis: {
                    ndvi,
                    thermal,
                    swir,
                    interpretation: surfaceInterpretation
                }
            };

            Logger.info(`[MineralRecon] Completed: ${reconResult.minerals.join(', ')} (confidence: ${reconResult.confidence})`);
            return reconResult;

        } catch (error: any) {
            Logger.error('[MineralRecon] Failed, using fallback', error);
            return {
                minerals: ['Au', 'Cu'],
                reasoning: 'Unable to perform full reconnaissance. Using default target minerals based on regional context.',
                nearestOccurrences: [],
                confidence: 0.5
            };
        }
    }

    /**
     * Interpret satellite data for geological significance
     */
    private static interpretSatelliteData(ndvi: number, thermal: number, swir: number): string {
        const factors: string[] = [];

        if (ndvi < 0.15) factors.push('sparse vegetation suggests exposed bedrock');
        if (thermal > 2.0) factors.push('thermal anomaly indicates possible hydrothermal activity');
        if (swir > 1.5) factors.push('SWIR signature suggests mineral alteration zones');

        if (factors.length === 0) {
            return 'No significant surface anomalies detected.';
        }

        return factors.join('; ') + '.';
    }

    /**
     * Normalize mineral names to standard symbols
     */
    private static normalizeMinerals(minerals: string[]): string[] {
        const normalized: string[] = [];

        for (const mineral of minerals) {
            const upper = mineral.toUpperCase();
            const lower = mineral.toLowerCase();

            // Check if already a symbol
            if (MINERAL_INFO[mineral]) {
                normalized.push(mineral);
            } else if (MINERAL_INFO[upper]) {
                normalized.push(upper);
            }
            // Check if it's a name
            else if (MINERAL_NAME_TO_SYMBOL[lower]) {
                normalized.push(MINERAL_NAME_TO_SYMBOL[lower]);
            }
        }

        // Remove duplicates
        return [...new Set(normalized)];
    }

    /**
     * Fallback prediction based on nearby deposits
     */
    private static fallbackPrediction(nearbyMinerals: string[], occurrences: string[], surfaceInterpretation?: string): any {
        const mineralCounts: Record<string, number> = {};

        for (const mineral of nearbyMinerals) {
            const symbol = MINERAL_NAME_TO_SYMBOL[mineral?.toLowerCase()] || mineral;
            if (MINERAL_INFO[symbol]) {
                mineralCounts[symbol] = (mineralCounts[symbol] || 0) + 1;
            }
        }

        // Get top 3 by frequency
        const sorted = Object.entries(mineralCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([symbol]) => symbol);

        return {
            minerals: sorted.length > 0 ? sorted : ['Au', 'Cu'],
            reasoning: `Based on ${occurrences.length} nearby mineral occurrences in the region. ${surfaceInterpretation || ''}`,
            confidence: 0.6
        };
    }

    /**
     * Generate mineral metadata for UI display
     */
    static generateMineralMetadata(minerals: string[]): Map<string, { label: string; color: string }> {
        const metadata = new Map<string, { label: string; color: string }>();

        for (const symbol of minerals) {
            const info = MINERAL_INFO[symbol] || {
                label: `${symbol} Mineral`,
                color: 'bg-gray-500'
            };
            metadata.set(symbol, info);
        }

        return metadata;
    }
}
