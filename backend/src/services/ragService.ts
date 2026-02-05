import { bigquery, embeddingModel } from '../config/gcp';
import dotenv from 'dotenv';

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

      // BigQuery Vector Search Query
      const query = `
        SELECT content, metadata, 
               VECTOR_DISTANCE(embedding, CAST('${embeddingString}' AS ARRAY<FLOAT64>), 'COSINE') as distance
        FROM 
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
}