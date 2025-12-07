import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { recommendationsService } from '../services/recommendations.js';
import { parseId } from '../utils/validation.js';

const router = Router();

// Get recommendations for problem
router.get('/problem/:problemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const problemId = parseId(req.params.problemId, 'problemId');
    const limit = parseInt((req.query.limit as string) || '5', 10) || 5;
    const recommendations = await recommendationsService.recommendAlgorithmsForProblem(
      problemId,
      req.userId,
      limit
    );
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get recommendations' });
  }
});

// Get optimization recommendations
router.get('/optimizations/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const algorithmId = parseId(req.params.algorithmId, 'algorithmId');
    const optimizations = await recommendationsService.recommendOptimizations(
      algorithmId,
      req.userId
    );
    res.json(optimizations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get optimizations' });
  }
});

// Find similar algorithms
router.get('/similar/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const algorithmId = parseId(req.params.algorithmId, 'algorithmId');
    const limit = parseInt((req.query.limit as string) || '5', 10) || 5;
    const similar = await recommendationsService.findSimilarAlgorithms(
      algorithmId,
      req.userId,
      limit
    );
    res.json(similar);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to find similar algorithms' });
  }
});

// Get user recommendations
router.get('/user', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '10', 10) || 10;
    const recommendations = await recommendationsService.getUserRecommendations(
      req.userId,
      limit
    );
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get recommendations' });
  }
});

// Mark recommendation as viewed
router.patch('/:recommendationId/viewed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const recommendationId = parseId(req.params.recommendationId, 'recommendationId');
    await recommendationsService.markViewed(recommendationId, req.userId);
    res.json({ message: 'Recommendation marked as viewed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark recommendation' });
  }
});

// Accept recommendation
router.patch('/:recommendationId/accept', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const recommendationId = parseId(req.params.recommendationId, 'recommendationId');
    await recommendationsService.acceptRecommendation(recommendationId, req.userId);
    res.json({ message: 'Recommendation accepted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to accept recommendation' });
  }
});

export { router as recommendationsRouter };

