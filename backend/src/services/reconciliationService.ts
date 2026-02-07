import { bigquery, generativeModel, dataProjectId } from '../config/gcp';
import { RAGService } from './ragService';
import dotenv from 'dotenv';

dotenv.config();

export interface ActualData {
  projectId: string;
  lat: number;
  lon: number;
  depth: number;
  actualGradeAu: number;
  actualGradeCu: number;
}

export interface ReconciliationSummary {
  varianceAu: number;
  varianceCu: number;
  status: 'STABLE' | 'DRIFTING';
  lessonsLearned: string;
  blockDetails?: any[]; // Detailed block data for visualization
  // Extended stats
  blocksAnalyzed: number;
  blocksDrifting: number;
  blocksStable: number;
  modelBias: 'over-estimation' | 'under-estimation' | 'balanced';
}

export class ReconciliationService {
  /**
   * Compares predicted vs actual data and generates a bias report
   */
  static async reconcile(actuals: ActualData[], predictedVoxels: any[]): Promise<ReconciliationSummary> {
    let totalDiffAu = 0;
    let totalDiffCu = 0;
    let matchCount = 0;
    const blockDetails: any[] = [];
    
    // Stats counters
    let blocksDrifting = 0;

    actuals.forEach(actual => {
      // Find nearest predicted voxel based on 3D distance
      // Optimization: This is O(N*M). For production use K-D Tree.
      let minDist = Infinity;
      let nearest: any = null;

      // Simple heuristic: filter by lat/lon first to reduce search space
      const candidates = predictedVoxels.filter(v => 
        Math.abs(v.lat - actual.lat) < 0.0005 && 
        Math.abs(v.lon - actual.lon) < 0.0005
      );

      candidates.forEach(curr => {
        const dist = Math.sqrt(Math.pow(curr.lat - actual.lat, 2) + Math.pow(curr.lon - actual.lon, 2) + Math.pow(curr.z - actual.depth, 2));
        if (dist < minDist) {
          minDist = dist;
          nearest = curr;
        }
      });

      if (nearest) {
        // variance = actual - predicted
        const diffAu = actual.actualGradeAu - (nearest.au_grade || 0);
        const diffCu = actual.actualGradeCu - (nearest.cu_grade || 0);
        
        totalDiffAu += diffAu;
        totalDiffCu += diffCu;
        matchCount++;

        // Determine if this specific block is drifting
        // Thresholds: Au > 0.5 g/t difference, Cu > 1.0 % difference
        const isDrifting = Math.abs(diffAu) > 0.5 || Math.abs(diffCu) > 1.0;
        if (isDrifting) blocksDrifting++;

        blockDetails.push({
          lat: actual.lat,
          lon: actual.lon,
          z: actual.depth,
          actualAu: actual.actualGradeAu,
          predAu: nearest.au_grade,
          varianceAu: diffAu,
          isDrifting
        });
      }
    });

    const avgDiffAu = matchCount > 0 ? totalDiffAu / matchCount : 0;
    const avgDiffCu = matchCount > 0 ? totalDiffCu / matchCount : 0;

    // Determine Project Status
    const status = (Math.abs(avgDiffAu) > 0.5 || Math.abs(avgDiffCu) > 1.0) ? 'DRIFTING' : 'STABLE';

    // Determine Model Bias
    // If avgDiff is negative, Actual < Predicted => Over-estimation
    // If avgDiff is positive, Actual > Predicted => Under-estimation
    let modelBias: 'over-estimation' | 'under-estimation' | 'balanced' = 'balanced';
    if (avgDiffAu < -0.2) modelBias = 'over-estimation';
    else if (avgDiffAu > 0.2) modelBias = 'under-estimation';

    // Generate Lessons Learned via Gemini
    const lessonsLearned = await this.generateLessonsLearned(avgDiffAu, avgDiffCu, status);

    // Save Bias Context to Vector Store (Recursive Feedback)
    if (status === 'DRIFTING') {
      await this.injectFeedback(lessonsLearned, actuals[0].lat, actuals[0].lon);
    }

    return {
      varianceAu: avgDiffAu,
      varianceCu: avgDiffCu,
      status,
      lessonsLearned,
      blockDetails,
      blocksAnalyzed: matchCount,
      blocksDrifting,
      blocksStable: matchCount - blocksDrifting,
      modelBias
    };
  }

  /**
   * Uses Gemini to analyze WHY the model drifted
   */
  private static async generateLessonsLearned(diffAu: number, diffCu: number, status: string): Promise<string> {
    if (status === 'STABLE') return "Model is performing within acceptable parameters.";

    const prompt = `
      Analyze the following mining model bias:
      - Average Gold (Au) Variance: ${diffAu} g/t
      - Average Copper (Cu) Variance: ${diffCu} %
      
      Task: Summarize why this bias might occur and provide a concise 'Lesson Learned' 
      for future predictions in this geological area. 
      Format: "Lesson: [Your analysis]"
    `;

    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    return (response.candidates && response.candidates[0].content.parts[0].text) || (response as any).text();
  }

  /**
   * Injects the bias analysis back into the Vector Search (RAG)
   */
  private static async injectFeedback(analysis: string, lat: number, lon: number) {
    try {
      const embedding = await RAGService.generateEmbedding(analysis);
      const datasetId = process.env.BQ_DATASET_ID;
      const tableId = process.env.BQ_TABLE_KNOWLEDGE;

      const rows = [{
        id: `feedback-${Date.now()}`,
        content: analysis,
        metadata: JSON.stringify({ type: 'bias-feedback', timestamp: new Date().toISOString() }),
        location: bigquery.geography(`POINT(${lon} ${lat})`),
        embedding: embedding
      }];

      await bigquery
        .dataset(datasetId!, { projectId: dataProjectId })
        .table(tableId!)
        .insert(rows);
      console.log('Feedback injected into Vector Store successfully.');
    } catch (error) {
      console.error('Failed to inject feedback:', error);
    }
  }
}