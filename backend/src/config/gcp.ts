import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

dotenv.config();

const projectId = process.env.GCP_PROJECT_ID || '';
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
const location = process.env.GCP_LOCATION || 'asia-southeast1';

export const bigquery = new BigQuery({
  projectId: projectId,
  keyFilename: keyFilename,
});

export const storage = new Storage({
  projectId: projectId,
  keyFilename: keyFilename,
});

export const vertexAI = new VertexAI({
  project: projectId,
  location: location,
});

console.log(`[GCP] Initialized clients for Project: ${projectId}`);

export const generativeModel = vertexAI.getGenerativeModel({
  model: process.env.VERTEX_AI_MODEL_ID || 'gemini-1.5-pro',
});

// Fix: Use getGenerativeModel directly for embeddings in newer SDK versions
export const embeddingModel = vertexAI.getGenerativeModel({
  model: 'text-embedding-004',
});