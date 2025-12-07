import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { algorithmRouter } from './routes/algorithms.js';
import { adminRouter } from './routes/admin.js';
import { jobRouter } from './routes/jobs.js';
import { projectRouter } from './routes/projects.js';
import { collectionRouter } from './routes/collections.js';
import { favoriteRouter } from './routes/favorites.js';
import { commentRouter } from './routes/comments.js';
import { notificationRouter } from './routes/notifications.js';
import { exportRouter } from './routes/exports.js';
import { sharingRouter } from './routes/sharing.js';
import { likeRouter } from './routes/likes.js';
import { problemRouter } from './routes/problems.js';
import { analyticsRouter } from './routes/analytics.js';
import { improvementRouter } from './routes/improvements.js';
import { combinationRouter } from './routes/combinations.js';
import { metricRouter } from './routes/metrics.js';
import { automationRouter } from './routes/automation.js';
import { codeRouter } from './routes/code.js';
import { testingRouter } from './routes/testing.js';
import { versionControlRouter } from './routes/versionControl.js';
import { collaborationRouter } from './routes/collaboration.js';
import { advancedAnalyticsRouter } from './routes/advancedAnalytics.js';
import { recommendationsRouter } from './routes/recommendations.js';
import statisticsRouter from './routes/statistics.js';
import usersRouter from './routes/users.js';
import exportImportRouter from './routes/exportImport.js';
import { activityLogsRouter } from './routes/activityLogs.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initDatabase } from './db/connection.js';
import { startScheduler } from './services/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - allow multiple origins
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'https://biosynth.youtilitybox.com'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/algorithms', algorithmRouter);
app.use('/api/admin', adminRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/projects', projectRouter);
app.use('/api/collections', collectionRouter);
app.use('/api/favorites', favoriteRouter);
app.use('/api/comments', commentRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/exports', exportRouter);
app.use('/api/sharing', sharingRouter);
app.use('/api/likes', likeRouter);
app.use('/api/problems', problemRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/improvements', improvementRouter);
app.use('/api/combinations', combinationRouter);
app.use('/api/metrics', metricRouter);
app.use('/api/automation', automationRouter);
app.use('/api/code', codeRouter);
app.use('/api/testing', testingRouter);
app.use('/api/version-control', versionControlRouter);
app.use('/api/collaboration', collaborationRouter);
app.use('/api/advanced-analytics', advancedAnalyticsRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/users', usersRouter);
app.use('/api/export-import', exportImportRouter);
app.use('/api/admin/activity-logs', activityLogsRouter);

// Error handling
app.use(errorHandler);

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
      
      // Start automation scheduler
      if (process.env.AUTOMATION_ENABLED !== 'false') {
        startScheduler();
      } else {
        console.log('ℹ️  Automation scheduler disabled (AUTOMATION_ENABLED=false)');
      }
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });

