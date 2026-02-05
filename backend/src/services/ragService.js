"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGService = void 0;
const gcp_1 = require("../config/gcp");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const datasetId = process.env.BQ_DATASET_ID;
const tableId = process.env.BQ_TABLE_KNOWLEDGE;
class RAGService {
    /**
     * Generates vector embedding for a given text using Vertex AI
     */
    static async generateEmbedding(text) {
        try {
            const result = await gcp_1.embeddingModel.embedContent({
                content: { parts: [{ text }], role: '' },
            });
            return result.embeddings[0].values;
        }
        catch (error) {
            console.error('Error generating embedding:', error);
            throw new Error('Failed to generate embedding');
        }
    }
    /**
     * Searches the BigQuery Vector Store for relevant geological snippets
     */
    static async searchKnowledge(queryText, limit = 5) {
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
            const [rows] = await gcp_1.bigquery.query({ query });
            return rows;
        }
        catch (error) {
            console.error('Error searching knowledge base:', error);
            return [];
        }
    }
}
exports.RAGService = RAGService;
//# sourceMappingURL=ragService.js.map