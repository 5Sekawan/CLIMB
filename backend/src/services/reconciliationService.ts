import { bigquery, generativeModel } from '../config/gcp';
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
}

export class ReconciliationService {
  /**
   * Compares predicted vs actual data and generates a bias report
   */
  static async reconcile(actuals: ActualData[], predictedVoxels: any[]): Promise<ReconciliationSummary> {
    let totalDiffAu = 0;
    let totalDiffCu = 0;
    let matchCount = 0;

    actuals.forEach(actual => {
      // Find nearest predicted voxel based on 3D distance
      const nearest = predictedVoxels.reduce((prev, curr) => {
        const distPrev = Math.sqrt(Math.pow(prev.lat - actual.lat, 2) + Math.pow(prev.lon - actual.lon, 2) + Math.pow(prev.z - actual.depth, 2));
        const distCurr = Math.sqrt(Math.pow(curr.lat - actual.lat, 2) + Math.pow(curr.lon - actual.lon, 2) + Math.pow(curr.z - actual.depth, 2));
        return distPrev < distCurr ? prev : curr;
      });

      if (nearest) {
        totalDiffAu += (actual.actualGradeAu - nearest.au_grade);
        totalDiffCu += (actual.actualGradeCu - nearest.cu_grade);
        matchCount++;
      }
    });

    const avgDiffAu = matchCount > 0 ? totalDiffAu / matchCount : 0;
    const avgDiffCu = matchCount > 0 ? totalDiffCu / matchCount : 0;

    // Determine Status
    const status = (Math.abs(avgDiffAu) > 0.5 || Math.abs(avgDiffCu) > 1.0) ? 'DRIFTING' : 'STABLE';

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
      lessonsLearned
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

      await bigquery.dataset(datasetId!).table(tableId!).insert(rows);
      console.log('Feedback injected into Vector Store successfully.');
    } catch (error) {
      console.error('Failed to inject feedback:', error);
    }
  }
}