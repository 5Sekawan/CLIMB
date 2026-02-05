"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.embeddingModel = exports.generativeModel = exports.vertexAI = exports.storage = exports.bigquery = void 0;
const bigquery_1 = require("@google-cloud/bigquery");
const storage_1 = require("@google-cloud/storage");
const vertexai_1 = require("@google-cloud/vertexai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const projectId = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION || 'us-central1';
exports.bigquery = new bigquery_1.BigQuery({
    projectId,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
exports.storage = new storage_1.Storage({
    projectId,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
exports.vertexAI = new vertexai_1.VertexAI({
    project: projectId || '',
    location: location,
});
exports.generativeModel = exports.vertexAI.getGenerativeModel({
    model: process.env.VERTEX_AI_MODEL_ID || 'gemini-1.5-pro',
});
exports.embeddingModel = exports.vertexAI.preview.getGenerativeModel({
    model: 'text-embedding-004',
});
//# sourceMappingURL=gcp.js.map