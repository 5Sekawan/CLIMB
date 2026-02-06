import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Database } from './config/database';
import projectRoutes from './routes/projectRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import reconciliationRoutes from './routes/reconciliationRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Connect to Database
Database.connect();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/reconciliation', reconciliationRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).send('CLIMB Backend is healthy');
});

// Start Server
app.listen(port, () => {
  console.log(`CLIMB Backend running on port ${port}`);
});
