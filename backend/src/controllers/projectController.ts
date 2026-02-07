import type { Request, Response } from 'express';
import { Project, IProject } from '../models/Project';
import { z } from 'zod';
import * as turf from '@turf/turf';
import { InferenceService } from '../services/inferenceService';
import { AnalyticsService, EconomicParams } from '../services/analyticsService';
import { ReconciliationService, ActualData } from '../services/reconciliationService';
import { ActivityService } from '../services/activityService';

// --- Validation Schemas ---

const createProjectSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  location: z.string().optional(),
  description: z.string().optional(),
  pins: z.array(z.object({
    lat: z.number(),
    lng: z.number()
  })).min(3, "At least 3 pins are required to form a polygon"),
  selectedDocuments: z.array(z.string()).optional() // Array of IDs
});

export class ProjectController {

  /**
   * GET /api/projects
   * List all projects with filtering and pagination.
   * Excludes heavy 'inferenceResults'.
   */
  static async getProjects(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const status = req.query.status as string;
      const search = req.query.search as string;

      const skip = (page - 1) * limit;
      const filter: any = {};

      if (status && status !== 'all') {
        filter.status = status;
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } }
        ];
      }

      // RBAC: If not admin, only show own projects
      const user = req.user;
      if (user && user.role !== 'admin') {
        filter.createdBy = user._id;
      }

      const total = await Project.countDocuments(filter);
      const projects = await Project.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-inferenceResults'); // EXCLUDE HEAVY DATA

      res.status(200).json({
        success: true,
        data: projects,
        meta: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        }
      });
    } catch (error: any) {
      console.error('Get Projects Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/projects
   * Create a new project from Wizard inputs (Name + Pins).
   */
  static async createProject(req: Request, res: Response) {
    try {
      // 1. Validate Input
      const validation = createProjectSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.format() });
      }

      const { name, pins, selectedDocuments, location, description } = validation.data;

      // 2. Convert Pins (Lat/Lng) to GeoJSON Polygon ([[Lon, Lat]])
      // Ensure closure: first point == last point
      const coordinates = pins.map(p => [p.lng, p.lat]);
      if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || 
          coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
        coordinates.push(coordinates[0]);
      }

      const polygon = turf.polygon([coordinates]);
      
      // 3. Calculate Center & Area
      const centerPt = turf.center(polygon);
      const areaKm2 = turf.area(polygon) / 1000000; // m2 to km2
      const centerStr = `${centerPt.geometry.coordinates[1].toFixed(4)}, ${centerPt.geometry.coordinates[0].toFixed(4)}`;

      // 4. Create Project
      const newProject = new Project({
        name,
        location: location || "Indonesia Region", // Default or reverse-geocoded later
        description,
        createdBy: req.user?._id, // Assign owner
        aoi: {
          type: 'Polygon',
          coordinates: [coordinates]
        },
        center: centerStr,
        area: parseFloat(areaKm2.toFixed(2)),
        documents: selectedDocuments || [],
        status: 'active', // Default status
        mineralMetadata: {
          'Au': { label: 'Gold (Au)', color: 'bg-amber-400' },
          'Cu': { label: 'Copper (Cu)', color: 'bg-orange-500' }
        }
      });

      await newProject.save();

      await ActivityService.log('system', `Created new project: ${name}`, newProject.id, name);

      res.status(201).json({ success: true, data: newProject });
    } catch (error: any) {
      console.error('Create Project Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/projects/:id
   * Get project details (Metadata + Cached Context).
   * NO Voxels.
   */
  static async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await Project.findById(id).select('-inferenceResults');

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.status(200).json({ success: true, data: project });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/projects/:id/voxels
   * Lazy load the 3D model data.
   */
  static async getProjectVoxels(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await Project.findById(id).select('inferenceResults');

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Return just the array to save bandwidth wrapper overhead? 
      // Or standard wrapper. Standard is better for consistency.
      res.status(200).json(project.inferenceResults || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/projects/:id/inference/start
   * Triggers the async inference job.
   */
  static async startInference(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await Project.findById(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.status === 'processing') {
        return res.status(409).json({ error: 'Inference already in progress' });
      }

      // Update status to processing
      project.status = 'processing';
      await project.save();

      // Trigger Async Job (Fire & Forget)
      InferenceService.runInferencePipeline(project.id)
        .catch(err => console.error(`[Inference Job] Failed for ${project.id}:`, err));

      res.status(202).json({ success: true, message: 'Inference job started' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/projects/:id/status
   * Polls the current status of the project inference.
   */
  static async getInferenceStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await Project.findById(id).select('status lastInferenceAt');

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.status(200).json({ 
        success: true, 
        status: project.status,
        lastInferenceAt: project.lastInferenceAt 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

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
