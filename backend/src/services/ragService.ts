import { bigquery, embeddingModel } from '../config/gcp';
const pdfParse = require('pdf-parse');
import dotenv from 'dotenv';
import { DocumentModel } from '../models/Document';

dotenv.config();

const datasetId = process.env.BQ_DATASET_ID;
const tableId = process.env.BQ_TABLE_KNOWLEDGE;

export class RAGService {
  /**
   * Generates vector embedding for a given text using Vertex AI
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Casting to any to avoid SDK version type mismatch
      const result = await (embeddingModel as any).embedContent({
        content: { parts: [{ text }], role: '' },
      });
      return result.embeddings[0].values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Searches the BigQuery Vector Store for relevant geological snippets
   */
  static async searchKnowledge(queryText: string, limit: number = 5): Promise<any[]> {
    try {
      const embedding = await this.generateEmbedding(queryText);
      const embeddingString = `[${embedding.join(',')}]`;

      // BigQuery Vector Search Query (Fixed: Added Table ID)
      const query = `
        SELECT content, metadata, 
               VECTOR_DISTANCE(embedding, CAST('${embeddingString}' AS ARRAY<FLOAT64>), 'COSINE') as distance
        FROM \`${datasetId}.${tableId}\`
        ORDER BY distance ASC
        LIMIT ${limit}
      `;

      const [rows] = await bigquery.query({ query });
      return rows;
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }

  /**
   * Ingests a PDF document into the Knowledge Base
   */
  static async ingestDocument(fileBuffer: Buffer, metadata: any, documentId: string, location?: string): Promise<void> {
    try {
      console.log(`[RAG] Starting ingestion for doc: ${documentId}`);
      const data = await pdfParse(fileBuffer);
      const fullText = data.text;

      // Recursive Chunking (Simple implementation: split by length with overlap)
      const chunkSize = 1000;
      const overlap = 100;
      const chunks: string[] = [];
      
      for (let i = 0; i < fullText.length; i += (chunkSize - overlap)) {
        chunks.push(fullText.substring(i, i + chunkSize));
      }

      console.log(`[RAG] Generated ${chunks.length} chunks. Generating embeddings...`);

      const rowsToInsert = [];
      for (const [index, chunk] of chunks.entries()) {
        // Skip empty or too short chunks
        if (chunk.trim().length < 50) continue;

        const embedding = await this.generateEmbedding(chunk);
        
        rowsToInsert.push({
          id: `${documentId}-${index}`,
          content: chunk,
          metadata: JSON.stringify({ ...metadata, chunkIndex: index, documentId }),
          // If location is provided, use it (WKT format), else null
          location: location ? bigquery.geography(location) : null, 
          embedding: embedding
        });
      }

      if (rowsToInsert.length > 0) {
        await bigquery.dataset(datasetId!).table(tableId!).insert(rowsToInsert);
        console.log(`[RAG] Successfully inserted ${rowsToInsert.length} chunks to Knowledge Base.`);
        
        // Update Status in MongoDB
        await DocumentModel.findByIdAndUpdate(documentId, {
          status: 'ready',
          chunkCount: rowsToInsert.length
        });
      } else {
        console.warn('[RAG] No valid chunks to insert.');
        await DocumentModel.findByIdAndUpdate(documentId, {
          status: 'error'
        });
      }

    } catch (error) {
      console.error('Error ingesting document:', error);
      await DocumentModel.findByIdAndUpdate(documentId, {
        status: 'error'
      });
      throw new Error('Document ingestion failed');
    }
  }
}