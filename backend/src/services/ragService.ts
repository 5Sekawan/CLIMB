import { bigquery, embeddingModel, dataProjectId } from '../config/gcp';
const pdfParse = require('pdf-parse');
import dotenv from 'dotenv';
import { DocumentModel } from '../models/Document';
import { Logger } from '../utils/logger';

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
      Logger.error('Error generating embedding', error);
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

      // BigQuery Vector Search Query (Fixed: Added Table ID and Data Project ID)
      const query = `
        SELECT content, metadata, 
               VECTOR_DISTANCE(embedding, CAST('${embeddingString}' AS ARRAY<FLOAT64>), 'COSINE') as distance
        FROM \`${dataProjectId}.${datasetId}.${tableId}\`
        ORDER BY distance ASC
        LIMIT ${limit}
      `;

      const [rows] = await bigquery.query({ query });
      Logger.info(`[RAG] Search returned ${rows.length} results for query: "${queryText.substring(0, 50)}..."`);
      return rows;
    } catch (error) {
      Logger.error('Error searching knowledge base', error);
      return [];
    }
  }

  /**
   * Ingests a PDF document into the Knowledge Base
   */
  static async ingestDocument(fileBuffer: Buffer, metadata: any, documentId: string, location?: string): Promise<void> {
    Logger.job('RAGIngestion', 'START', `Processing document: ${documentId}`, { filename: metadata.filename });
    try {
      const data = await pdfParse(fileBuffer);
      const fullText = data.text;
      Logger.info(`[RAG] PDF parsed successfully. Length: ${fullText.length} chars.`);

      // Recursive Chunking (Simple implementation: split by length with overlap)
      const chunkSize = 1000;
      const overlap = 100;
      const chunks: string[] = [];
      
      for (let i = 0; i < fullText.length; i += (chunkSize - overlap)) {
        chunks.push(fullText.substring(i, i + chunkSize));
      }

      Logger.info(`[RAG] Generated ${chunks.length} chunks. Starting embedding generation...`);

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

        if ((index + 1) % 10 === 0) {
          Logger.info(`[RAG] Embedded ${index + 1}/${chunks.length} chunks...`);
        }
      }

      if (rowsToInsert.length > 0) {
        // Insert into the Data Project
        await bigquery
          .dataset(datasetId!, { projectId: dataProjectId })
          .table(tableId!)
          .insert(rowsToInsert);
          
        Logger.job('RAGIngestion', 'DONE', `Successfully ingested ${rowsToInsert.length} chunks into BigQuery.`);
        
        // Update Status in MongoDB
        await DocumentModel.findByIdAndUpdate(documentId, {
          status: 'ready',
          chunkCount: rowsToInsert.length
        });
      } else {
        Logger.warn('[RAG] No valid chunks to insert.');
        await DocumentModel.findByIdAndUpdate(documentId, {
          status: 'error'
        });
      }

    } catch (error) {
      Logger.error(`Document ingestion failed for ${documentId}`, error);
      await DocumentModel.findByIdAndUpdate(documentId, {
        status: 'error'
      });
      throw new Error('Document ingestion failed');
    }
  }
}