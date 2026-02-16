import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const projectId = process.env.GCP_PROJECT_ID || '';
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
const location = process.env.GCP_LOCATION || 'asia-southeast1';

// Cross-Project Query Support
// Use BQ_DATA_PROJECT_ID if the data lives in a different project than the billing/execution project.
export const dataProjectId = process.env.BQ_DATA_PROJECT_ID || projectId;

export const bigquery = new BigQuery({
  projectId: projectId, // Job Execution & Billing Project
  keyFilename: keyFilename,
});

export const storage = new Storage({
  projectId: projectId,
  keyFilename: keyFilename,
});

// Initialize Google GenAI with API Key
const geminiApiKey = process.env.GEMINI_API_KEY || '';
if (!geminiApiKey) {
  console.warn('[GenAI] Warning: GEMINI_API_KEY not set. LLM features will not work.');
}

export const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

// Model ID (default to gemini-2.0-flash for better performance/cost)
const modelId = process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash';

console.log(`[GCP] Initialized clients for Project: ${projectId}`);
console.log(`[GenAI] Using model: ${modelId}`);

/**
 * Generate content using Google GenAI SDK
 * This replaces the Vertex AI generativeModel.generateContent() calls
 */
export async function generateContent(prompt: string): Promise<string> {
  try {
    const response = await genAI.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error('[GenAI] Error generating content:', error);
    throw error;
  }
}

/**
 * Legacy export for backward compatibility
 * Wraps the new SDK in a similar interface to Vertex AI
 */
export const generativeModel = {
  generateContent: async (prompt: string) => {
    const text = await generateContent(prompt);
    return {
      response: {
        candidates: [{
          content: {
            parts: [{ text }]
          }
        }],
        text: () => text
      }
    };
  }
};