import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';

const router = Router();

// CRUD Operations
router.get('/', ProjectController.getProjects);
router.post('/', ProjectController.createProject);
router.get('/:id', ProjectController.getProject);
router.get('/:id/voxels', ProjectController.getProjectVoxels);

// Async Inference
router.post('/:id/inference/start', ProjectController.startInference);
router.get('/:id/status', ProjectController.getInferenceStatus);

// Legacy / Specialized Operations
router.post('/predict', ProjectController.createInference);
router.post('/simulate', ProjectController.simulateParameters);
router.post('/actuals', ProjectController.submitActuals);

export default router;
