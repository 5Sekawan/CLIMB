import type { Request, Response } from 'express';
import { InferenceService } from '../services/inferenceService';
import { AnalyticsService, EconomicParams } from '../services/analyticsService';
import { ReconciliationService, ActualData } from '../services/reconciliationService';

export class ProjectController {
  /**
   * Phase 3: Trigger 3D Grade Prediction
   */
  static async createInference(req: Request, res: Response) {
    try {
      const { name, polygon } = req.body;
      if (!name || !polygon) return res.status(400).json({ error: 'Missing parameters' });

      const voxelData = await InferenceService.predictGrade(name, polygon);
      
      // Automatic initial analysis with default parameters (Enterprise Defaults)
      const defaultParams: EconomicParams = {
        priceAu: 1800, // USD/oz
        priceCu: 8500, // USD/ton
        miningCost: 2.5, // USD/ton
        processingCost: 12.0, // USD/ton
        recoveryRate: 0.85,
        density: 2.5
      };

      const analysis = AnalyticsService.analyzeZones(voxelData, 0.5, defaultParams);

      res.status(200).json({
        success: true,
        project: name,
        analysis,
        data: voxelData
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Phase 4: Dynamic Simulation
   */
  static async simulateParameters(req: Request, res: Response) {
    try {
      const { voxelData, cog, economicParams } = req.body;
      
      if (!voxelData || cog === undefined || !economicParams) {
        return res.status(400).json({ error: 'Missing voxelData, COG, or economicParams' });
      }

      const analysis = AnalyticsService.analyzeZones(voxelData, Number(cog), economicParams);
      res.status(200).json({ success: true, analysis });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Phase 5: Reconciliation & Feedback Loop
   */
  static async submitActuals(req: Request, res: Response) {
    try {
      const { projectId, actuals, predictedVoxels } = req.body;
      if (!actuals || !predictedVoxels) return res.status(400).json({ error: 'Missing actuals or prediction data' });

      const report = await ReconciliationService.reconcile(actuals as ActualData[], predictedVoxels);
      res.status(200).json({ success: true, reconciliationReport: report });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
