import { Router } from 'express';
import multer from 'multer';
import { KnowledgeController } from '../controllers/knowledgeController';

const router = Router();

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes
router.post('/upload', upload.single('file'), KnowledgeController.uploadDocument);
router.get('/', KnowledgeController.getDocuments);

export default router;
