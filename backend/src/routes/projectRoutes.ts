import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';

const router = Router();

// Phase 3: Inference
router.post('/predict', ProjectController.createInference);

// Phase 4: Simulation
router.post('/simulate', ProjectController.simulateParameters);

// Phase 5: Reconciliation
router.post('/actuals', ProjectController.submitActuals);

export default router;
