import { Router } from 'express';
import { ActivityController } from '../controllers/activityController';

const router = Router();

router.get('/', ActivityController.getRecent);

export default router;
