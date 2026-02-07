import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { Database } from './config/database';
import projectRoutes from './routes/projectRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import reconciliationRoutes from './routes/reconciliationRoutes';
import activityRoutes from './routes/activityRoutes';
import authRoutes from './routes/authRoutes';
import { InferenceService } from './services/inferenceService';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Connect to Database
Database.connect().then(() => {
  // Run cleanup on DB connect
  InferenceService.cleanupStaleJobs();
});

// Middleware
// 1. CORS (Allow All Origins)
app.use(cors());

app.use(express.json());

// 2. Rate Limiting
// General Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Heavy Limiter (AI Inference & Uploads)
const heavyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20, // limit each IP to 20 heavy requests per hour
  message: { error: 'Too many AI/Upload requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply General Limiter to all API routes
app.use('/api', generalLimiter);

// Apply Heavy Limiter to specific paths
app.use('/api/projects/:id/inference/start', heavyLimiter);
app.use('/api/knowledge/upload', heavyLimiter);
app.use('/api/reconciliation/upload', heavyLimiter);

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/auth', authRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).send('CLIMB Backend is healthy');
});

// Start Server
app.listen(port, () => {
  console.log(`CLIMB Backend running on port ${port}`);
  console.log(`CORS Configured for: ${frontendUrl}`);
});
