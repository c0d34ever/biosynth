import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const scoreSchema = z.object({
  overallScore: z.number().min(0).max(100).optional(),
  feasibilityScore: z.number().min(0).max(100).optional(),
  efficiencyScore: z.number().min(0).max(100).optional(),
  innovationScore: z.number().min(0).max(100).optional(),
  applicabilityScore: z.number().min(0).max(100).optional(),
  robustnessScore: z.number().min(0).max(100).optional(),
  scalabilityScore: z.number().min(0).max(100).optional(),
  maintainabilityScore: z.number().min(0).max(100).optional(),
  notes: z.string().optional()
});

// Get algorithm scores
router.get('/:algorithmId/scores', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [scores] = await pool.query(
      `SELECT s.*, u.name as evaluator_name
      FROM algorithm_scores s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.algorithm_id = ?
      ORDER BY s.updated_at DESC`,
      [req.params.algorithmId]
    ) as any[];

    res.json(scores);
  } catch (error) {
    throw error;
  }
});

// Create/update algorithm score
router.post('/:algorithmId/scores', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = scoreSchema.parse(req.body);
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

    // Calculate overall score if not provided
    const scores = [
      data.feasibilityScore,
      data.efficiencyScore,
      data.innovationScore,
      data.applicabilityScore,
      data.robustnessScore,
      data.scalabilityScore,
      data.maintainabilityScore
    ].filter(s => s !== undefined);

    const overallScore = data.overallScore || 
      (scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null);

    await pool.query(
      `INSERT INTO algorithm_scores 
      (algorithm_id, user_id, overall_score, feasibility_score, efficiency_score, 
       innovation_score, applicability_score, robustness_score, scalability_score, 
       maintainability_score, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      overall_score = VALUES(overall_score),
      feasibility_score = COALESCE(VALUES(feasibility_score), feasibility_score),
      efficiency_score = COALESCE(VALUES(efficiency_score), efficiency_score),
      innovation_score = COALESCE(VALUES(innovation_score), innovation_score),
      applicability_score = COALESCE(VALUES(applicability_score), applicability_score),
      robustness_score = COALESCE(VALUES(robustness_score), robustness_score),
      scalability_score = COALESCE(VALUES(scalability_score), scalability_score),
      maintainability_score = COALESCE(VALUES(maintainability_score), maintainability_score),
      notes = COALESCE(VALUES(notes), notes),
      updated_at = NOW()`,
      [
        req.params.algorithmId,
        req.userId,
        overallScore,
        data.feasibilityScore || null,
        data.efficiencyScore || null,
        data.innovationScore || null,
        data.applicabilityScore || null,
        data.robustnessScore || null,
        data.scalabilityScore || null,
        data.maintainabilityScore || null,
        data.notes || null
      ]
    );

    const [result] = await pool.query(
      'SELECT * FROM algorithm_scores WHERE algorithm_id = ? AND user_id = ?',
      [req.params.algorithmId, req.userId]
    ) as any[];

    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Get gaps
router.get('/:algorithmId/gaps', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [gaps] = await pool.query(
      `SELECT g.*, u.name as identified_by_name
      FROM algorithm_gaps g
      LEFT JOIN users u ON g.user_id = u.id
      WHERE g.algorithm_id = ?
      ORDER BY 
        CASE g.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        g.created_at DESC`,
      [req.params.algorithmId]
    ) as any[];

    res.json(gaps);
  } catch (error) {
    throw error;
  }
});

// Create gap
router.post('/:algorithmId/gaps', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { gapType, description, severity, impact, suggestedSolution } = req.body;
    if (!gapType || !description) {
      res.status(400).json({ error: 'gapType and description required' });
      return;
    }

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
      `INSERT INTO algorithm_gaps 
      (algorithm_id, user_id, gap_type, description, severity, impact, suggested_solution)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.algorithmId,
        req.userId,
        gapType,
        description,
        severity || 'medium',
        impact || null,
        suggestedSolution || null
      ]
    ) as any[];

    const [gaps] = await pool.query(
      'SELECT * FROM algorithm_gaps WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json(gaps[0]);
  } catch (error) {
    throw error;
  }
});

// Get strengths
router.get('/:algorithmId/strengths', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [strengths] = await pool.query(
      `SELECT s.*, u.name as identified_by_name
      FROM algorithm_strengths s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.algorithm_id = ?
      ORDER BY 
        CASE s.impact_level
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        s.created_at DESC`,
      [req.params.algorithmId]
    ) as any[];

    res.json(strengths);
  } catch (error) {
    throw error;
  }
});

// Create strength
router.post('/:algorithmId/strengths', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { strengthType, description, evidence, impactLevel } = req.body;
    if (!strengthType || !description) {
      res.status(400).json({ error: 'strengthType and description required' });
      return;
    }

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
      `INSERT INTO algorithm_strengths 
      (algorithm_id, user_id, strength_type, description, evidence, impact_level)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.params.algorithmId,
        req.userId,
        strengthType,
        description,
        evidence || null,
        impactLevel || 'medium'
      ]
    ) as any[];

    const [strengths] = await pool.query(
      'SELECT * FROM algorithm_strengths WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json(strengths[0]);
  } catch (error) {
    throw error;
  }
});

// Get weaknesses
router.get('/:algorithmId/weaknesses', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [weaknesses] = await pool.query(
      `SELECT w.*, u.name as identified_by_name
      FROM algorithm_weaknesses w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE w.algorithm_id = ?
      ORDER BY 
        CASE w.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        w.created_at DESC`,
      [req.params.algorithmId]
    ) as any[];

    res.json(weaknesses);
  } catch (error) {
    throw error;
  }
});

// Create weakness
router.post('/:algorithmId/weaknesses', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { weaknessType, description, impact, severity, mitigationStrategy } = req.body;
    if (!weaknessType || !description) {
      res.status(400).json({ error: 'weaknessType and description required' });
      return;
    }

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
      `INSERT INTO algorithm_weaknesses 
      (algorithm_id, user_id, weakness_type, description, impact, severity, mitigation_strategy)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.algorithmId,
        req.userId,
        weaknessType,
        description,
        impact || null,
        severity || 'medium',
        mitigationStrategy || null
      ]
    ) as any[];

    const [weaknesses] = await pool.query(
      'SELECT * FROM algorithm_weaknesses WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json(weaknesses[0]);
  } catch (error) {
    throw error;
  }
});

// Get comprehensive analytics
router.get('/:algorithmId/analytics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();

    // Get all analytics data
    const [scores] = await pool.query(
      'SELECT AVG(overall_score) as avg_score, COUNT(*) as score_count FROM algorithm_scores WHERE algorithm_id = ?',
      [req.params.algorithmId]
    ) as any[];

    const [gaps] = await pool.query(
      `SELECT gap_type, severity, COUNT(*) as count
      FROM algorithm_gaps
      WHERE algorithm_id = ? AND status != 'resolved'
      GROUP BY gap_type, severity`,
      [req.params.algorithmId]
    ) as any[];

    const [strengths] = await pool.query(
      `SELECT strength_type, impact_level, COUNT(*) as count
      FROM algorithm_strengths
      WHERE algorithm_id = ?
      GROUP BY strength_type, impact_level`,
      [req.params.algorithmId]
    ) as any[];

    const [weaknesses] = await pool.query(
      `SELECT weakness_type, severity, COUNT(*) as count
      FROM algorithm_weaknesses
      WHERE algorithm_id = ? AND status != 'mitigated'
      GROUP BY weakness_type, severity`,
      [req.params.algorithmId]
    ) as any[];

    const [metrics] = await pool.query(
      `SELECT metric_type, AVG(metric_value) as avg_value, MAX(metric_value) as max_value, MIN(metric_value) as min_value
      FROM algorithm_metrics
      WHERE algorithm_id = ?
      GROUP BY metric_type`,
      [req.params.algorithmId]
    ) as any[];

    res.json({
      scores: scores[0],
      gaps: gaps,
      strengths: strengths,
      weaknesses: weaknesses,
      metrics: metrics
    });
  } catch (error) {
    throw error;
  }
});

export { router as analyticsRouter };

