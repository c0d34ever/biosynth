import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const metricSchema = z.object({
  metricType: z.enum(['execution_time', 'memory_usage', 'accuracy', 'precision', 'recall', 'throughput', 'error_rate', 'success_rate']),
  metricValue: z.number(),
  unit: z.string().optional(),
  context: z.string().optional(),
  testEnvironment: z.string().optional()
});

// Get metrics for algorithm
router.get('/algorithm/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { metricType, limit = 100 } = req.query;

    let query = `
      SELECT * FROM algorithm_metrics
      WHERE algorithm_id = ?
    `;

    const params: any[] = [req.params.algorithmId];

    if (metricType) {
      query += ' AND metric_type = ?';
      params.push(metricType);
    }

    query += ' ORDER BY recorded_at DESC LIMIT ?';
    params.push(parseInt(limit as string));

    const [metrics] = await pool.query(query, params) as any[];

    res.json(metrics);
  } catch (error) {
    throw error;
  }
});

// Add metric
router.post('/algorithm/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = metricSchema.parse(req.body);
    const pool = getPool();

    // Verify algorithm access
    const [algorithms] = await pool.query(
      'SELECT id FROM algorithms WHERE id = ? AND (user_id = ? OR visibility = "public")',
      [req.params.algorithmId, req.userId]
    ) as any[];

    if (algorithms.length === 0) {
      res.status(404).json({ error: 'Algorithm not found' });
      return;
    }

    const [result] = await pool.query(
      `INSERT INTO algorithm_metrics 
      (algorithm_id, metric_type, metric_value, unit, context, test_environment)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.params.algorithmId,
        data.metricType,
        data.metricValue,
        data.unit || null,
        data.context || null,
        data.testEnvironment || null
      ]
    ) as any[];

    const [metrics] = await pool.query(
      'SELECT * FROM algorithm_metrics WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json(metrics[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Get metric statistics
router.get('/algorithm/:algorithmId/statistics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { metricType } = req.query;

    let query = `
      SELECT 
        metric_type,
        AVG(metric_value) as avg_value,
        MAX(metric_value) as max_value,
        MIN(metric_value) as min_value,
        STDDEV(metric_value) as std_dev,
        COUNT(*) as count
      FROM algorithm_metrics
      WHERE algorithm_id = ?
    `;

    const params: any[] = [req.params.algorithmId];

    if (metricType) {
      query += ' AND metric_type = ?';
      params.push(metricType);
    }

    query += ' GROUP BY metric_type';

    const [stats] = await pool.query(query, params) as any[];

    res.json(stats);
  } catch (error) {
    throw error;
  }
});

export { router as metricRouter };

