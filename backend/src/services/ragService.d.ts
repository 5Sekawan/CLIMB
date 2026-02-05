export declare class RAGService {
    /**
     * Generates vector embedding for a given text using Vertex AI
     */
    static generateEmbedding(text: string): Promise<number[]>;
    /**
     * Searches the BigQuery Vector Store for relevant geological snippets
     */
    static searchKnowledge(queryText: string, limit?: number): Promise<any[]>;
}
//# sourceMappingURL=ragService.d.ts.map