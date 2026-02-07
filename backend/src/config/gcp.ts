import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';
import { VertexAI } from '@google-cloud/vertexai';
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

export const vertexAI = new VertexAI({
  project: projectId,
  location: 'us-central1', // Specific location for Generative AI availability
});

console.log(`[GCP] Initialized clients for Project: ${projectId}`);

export const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-1.5-pro', // Force stable model
});

// Fix: Use getGenerativeModel directly for embeddings in newer SDK versions
export const embeddingModel = vertexAI.getGenerativeModel({
  model: 'text-embedding-004',
});