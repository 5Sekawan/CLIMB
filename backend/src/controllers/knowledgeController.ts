import type { Request, Response } from 'express';
import { DocumentModel } from '../models/Document';
import { RAGService } from '../services/ragService';

export class KnowledgeController {
  
  /**
   * POST /api/knowledge/upload
   * Handles file upload and triggers async RAG ingestion.
   */
  static async uploadDocument(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      
      // 1. Create Initial Document Record in MongoDB
      const newDoc = new DocumentModel({
        filename: file.originalname,
        storedName: file.originalname, // For now using original name, in prod use unique ID
        size: file.size,
        status: 'processing',
        metadata: {
          mimeType: file.mimetype,
          encoding: file.encoding
        }
      });

      await newDoc.save();

      // 2. Trigger Async Processing (Fire & Forget)
      // We do NOT await this to prevent timeout
      RAGService.ingestDocument(file.buffer, { filename: file.originalname }, newDoc.id)
        .catch(err => {
          console.error(`[Async Job] Ingestion failed for ${newDoc.id}`, err);
          // Status update to 'error' is handled inside RAGService or here if we want double safety
        });

      // 3. Return accepted response
      res.status(202).json({
        success: true,
        data: {
          id: newDoc._id,
          filename: newDoc.filename,
          status: 'processing'
        }
      });

    } catch (error: any) {
      console.error('Upload Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/knowledge
   * List all documents in the Knowledge Base
   */
  static async getDocuments(req: Request, res: Response) {
    try {
      const documents = await DocumentModel.find().sort({ uploadedAt: -1 });
      res.status(200).json({ success: true, data: documents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
