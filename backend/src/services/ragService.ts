import { bigquery, dataProjectId } from '../config/gcp';
const pdf = require('pdf-parse');
import dotenv from 'dotenv';
import { DocumentModel } from '../models/Document';
import { Logger } from '../utils/logger';

dotenv.config();

const datasetId = process.env.BQ_DATASET_ID;
const tableId = process.env.BQ_TABLE_KNOWLEDGE;

export class RAGService {
  /**
   * Generates vector embedding using raw REST API to avoid SDK version issues
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const { GoogleAuth } = require('google-auth-library');
      const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform'
      });
      
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      
      // Use the configured Project ID (Billing Project) for the API call
      const projectId = process.env.GCP_PROJECT_ID;
      const location = process.env.GCP_LOCATION || 'us-central1';
      const modelId = 'text-embedding-004';
      
      const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instances: [{ content: text }],
          parameters: { autoTruncate: false }
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Vertex API Error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json() as any;
      // Parse response structure for text-embedding-004
      // Response format: { predictions: [ { embeddings: { values: [...] } } ] }
      const values = data.predictions?.[0]?.embeddings?.values;
      
      if (!values) {
        throw new Error('Invalid embedding response format');
      }
      
      return values;

    } catch (error) {
      Logger.error('Error generating embedding (REST)', error);
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

      // Standard SQL Cosine Distance (1 - Cosine Similarity)
      // Fixed: Use JSON_EXTRACT_ARRAY to correctly parse the embedding string
      const query = `
        WITH input_vector AS (
          SELECT ARRAY(
            SELECT CAST(json_element AS FLOAT64) 
            FROM UNNEST(JSON_EXTRACT_ARRAY('${embeddingString}')) AS json_element
          ) as vec
        )
        SELECT content, metadata,
          (
            1 - (
              (SELECT SUM(v1 * v2) FROM UNNEST(embedding) v1 WITH OFFSET i JOIN UNNEST(vec) v2 WITH OFFSET j ON i = j)
              /
              (SQRT((SELECT SUM(v * v) FROM UNNEST(embedding) v)) * SQRT((SELECT SUM(v * v) FROM UNNEST(vec) v)))
            )
          ) as distance
        FROM \`${dataProjectId}.${datasetId}.${tableId}\`, input_vector
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
      const data = await pdf(fileBuffer);
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