import { Router } from 'express';
import multer from 'multer';
import { ReconciliationController } from '../controllers/reconciliationController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), ReconciliationController.uploadActuals);
router.post('/inject-feedback', ReconciliationController.injectFeedback);

export default router;
