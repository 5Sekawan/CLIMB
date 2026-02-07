import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// CRUD Operations
router.get('/', protect, ProjectController.getProjects);
router.post('/', protect, ProjectController.createProject);
router.get('/:id', protect, ProjectController.getProject);
router.get('/:id/voxels', protect, ProjectController.getProjectVoxels);

// Async Inference
router.post('/:id/inference/start', protect, ProjectController.startInference);
router.get('/:id/status', protect, ProjectController.getInferenceStatus);

// Legacy / Specialized Operations
router.post('/predict', ProjectController.createInference);
router.post('/simulate', ProjectController.simulateParameters);
router.post('/actuals', ProjectController.submitActuals);

export default router;
