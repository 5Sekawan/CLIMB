import type { Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { ReconciliationService, ActualData } from '../services/reconciliationService';
import { Project } from '../models/Project';
import { bigquery, generativeModel } from '../config/gcp';
import { RAGService } from '../services/ragService';

// --- Validation Schemas ---
const uploadActualsSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
});

const injectFeedbackSchema = z.object({
  projectId: z.string().optional(),
  lesson: z.string().min(5, "Lesson text is too short"),
  location: z.object({
    lat: z.number(),
    lon: z.number()
  })
});

export class ReconciliationController {
  
  /**
   * POST /api/reconciliation/upload
   * Upload CSV actuals and trigger reconciliation analysis.
   */
  static async uploadActuals(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No CSV file uploaded' });
      }

      // Validate Body
      const validation = uploadActualsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.format() });
      }
      
      const { projectId } = validation.data;

      const project = await Project.findById(projectId).select('+inferenceResults');
      if (!project || !project.inferenceResults) {
        return res.status(404).json({ error: 'Project or inference data not found' });
      }

      // Parse CSV
      const fileContent = req.file.buffer.toString('utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      // Map CSV to ActualData interface (Flexible mapping)
      const actuals: ActualData[] = records.map((record: any) => {
        // Try to find lat/lon/grade columns flexibly
        const lat = parseFloat(record.lat || record.latitude || record.LAT || 0);
        const lon = parseFloat(record.lon || record.lng || record.longitude || record.LONG || 0);
        const depth = parseFloat(record.depth || record.z || record.elevation || 0);
        const au = parseFloat(record.au || record.Au || record.gold || record.grade_au || 0);
        const cu = parseFloat(record.cu || record.Cu || record.copper || record.grade_cu || 0);

        return {
          projectId,
          lat,
          lon,
          depth,
          actualGradeAu: isNaN(au) ? 0 : au,
          actualGradeCu: isNaN(cu) ? 0 : cu
        };
      }).filter((d: ActualData) => d.lat !== 0 && d.lon !== 0);

      if (actuals.length === 0) {
        return res.status(400).json({ error: 'No valid data points found in CSV' });
      }

      // Run Reconciliation
      const summary = await ReconciliationService.reconcile(actuals, project.inferenceResults);

      // Update project drift status
      if (summary.status === 'DRIFTING') {
        project.driftStatus = 'drifting';
        await project.save();
      }

      res.status(200).json({
        success: true,
        summary,
        count: actuals.length
      });

    } catch (error: any) {
      console.error('Reconciliation Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/reconciliation/inject-feedback
   * Manually injects a lesson learned into the Vector Store.
   */
  static async injectFeedback(req: Request, res: Response) {
    try {
      // Validate Body
      const validation = injectFeedbackSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.format() });
      }

      const { projectId, lesson, location } = validation.data;

      // Generate embedding for the lesson
      const embedding = await RAGService.generateEmbedding(lesson);
      
      const datasetId = process.env.BQ_DATASET_ID;
      const tableId = process.env.BQ_TABLE_KNOWLEDGE;

      const rows = [{
        id: `feedback-${Date.now()}`,
        content: lesson,
        metadata: JSON.stringify({ 
          type: 'manual-feedback', 
          projectId: projectId || 'global',
          timestamp: new Date().toISOString() 
        }),
        location: bigquery.geography(`POINT(${location.lon} ${location.lat})`),
        embedding: embedding
      }];

      await bigquery.dataset(datasetId!).table(tableId!).insert(rows);

      res.status(200).json({ success: true, message: 'Feedback injected successfully' });

    } catch (error: any) {
      console.error('Inject Feedback Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
