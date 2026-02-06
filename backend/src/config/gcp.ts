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

export const generativeModel = vertexAI.getGenerativeModel({
  model: process.env.VERTEX_AI_MODEL_ID || 'gemini-3-pro-preview',
});

// Use the standard method for preview models if applicable, 
// or cast to any if the types are lagging behind the SDK features
export const embeddingModel = (vertexAI as any).preview.getGenerativeModel({
  model: 'text-embedding-004',
});