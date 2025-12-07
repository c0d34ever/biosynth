import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { advancedAnalyticsService } from '../services/advancedAnalytics.js';
import { parseId, parseOptionalId } from '../utils/validation.js';

const router = Router();

const forecastSchema = z.object({
  forecastDays: z.number().min(1).max(90).optional()
});

const trendsSchema = z.object({
  periodDays: z.number().min(1).max(365).optional(),
  trendType: z.enum(['performance', 'usage', 'popularity', 'score']).optional()
});

// Predict performance
router.post('/predict/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const algorithmId = parseId(req.params.algorithmId, 'algorithmId');
    const prediction = await advancedAnalyticsService.predictPerformance(algorithmId, req.userId!);
    res.json(prediction);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to predict performance' });
  }
});

// Analyze trends
router.get('/trends/:algorithmId?', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const algorithmId = parseOptionalId(req.params.algorithmId);
    const data = trendsSchema.parse(req.query);

    const trends = await advancedAnalyticsService.analyzeTrends(
      algorithmId,
      req.userId,
      {
        periodDays: data.periodDays,
        trendType: data.trendType
      }
    );

    res.json(trends);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to analyze trends' });
  }
});

// Forecast performance
router.post('/forecast/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const algorithmId = parseId(req.params.algorithmId, 'algorithmId');
    const data = forecastSchema.parse(req.body);

    const forecast = await advancedAnalyticsService.forecastPerformance(
      algorithmId,
      req.userId!,
      data.forecastDays || 30
    );

    res.json(forecast);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to forecast performance' });
  }
});

export { router as advancedAnalyticsRouter };

