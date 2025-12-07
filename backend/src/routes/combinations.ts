import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const combinationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  useCase: z.string().optional(),
  algorithmIds: z.array(z.number()).min(2),
  roles: z.array(z.string()).optional(),
  weights: z.array(z.number()).optional()
});

// Get all combinations
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { recommended } = req.query;

    let query = `
      SELECT c.*, COUNT(ca.algorithm_id) as algorithm_count
      FROM algorithm_combinations c
      LEFT JOIN combination_algorithms ca ON c.id = ca.combination_id
      WHERE c.user_id = ? OR c.user_id IS NULL
    `;

    const params: any[] = [req.userId];

    if (recommended === 'true') {
      query += ' AND c.is_recommended = TRUE';
    }

    query += ' GROUP BY c.id ORDER BY c.effectiveness_score DESC, c.popularity_score DESC';

    const [combinations] = await pool.query(query, params) as any[];

    res.json(combinations);
  } catch (error) {
    throw error;
  }
});

// Get single combination with algorithms
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [combinations] = await pool.query(
      'SELECT * FROM algorithm_combinations WHERE id = ?',
      [req.params.id]
    ) as any[];

    if (combinations.length === 0) {
      res.status(404).json({ error: 'Combination not found' });
      return;
    }

    const combination = combinations[0];

    // Get algorithms
    const [algorithms] = await pool.query(
      `SELECT a.*, ca.role, ca.weight, ca.sequence_order
      FROM algorithms a
      JOIN combination_algorithms ca ON a.id = ca.algorithm_id
      WHERE ca.combination_id = ?
      ORDER BY ca.sequence_order ASC`,
      [req.params.id]
    ) as any[];

    res.json({
      ...combination,
      algorithms: algorithms.map((algo: any) => ({
        ...algo,
        steps: JSON.parse(algo.steps),
        applications: JSON.parse(algo.applications),
        tags: JSON.parse(algo.tags),
        parentIds: algo.parentIds ? JSON.parse(algo.parentIds) : null
      }))
    });
  } catch (error) {
    throw error;
  }
});

// Create combination
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = combinationSchema.parse(req.body);
    const pool = getPool();

    // Verify all algorithms exist and are accessible
    const placeholders = data.algorithmIds.map(() => '?').join(',');
    const [algorithms] = await pool.query(
      `SELECT id FROM algorithms 
      WHERE id IN (${placeholders}) 
      AND (user_id = ? OR visibility = 'public')`,
      [...data.algorithmIds, req.userId]
    ) as any[];

    if (algorithms.length !== data.algorithmIds.length) {
      res.status(400).json({ error: 'Some algorithms not found or not accessible' });
      return;
    }

    const [result] = await pool.query(
      `INSERT INTO algorithm_combinations 
      (user_id, name, description, use_case)
      VALUES (?, ?, ?, ?)`,
      [
        req.userId,
        data.name,
        data.description || null,
        data.useCase || null
      ]
    ) as any[];

    const combinationId = result.insertId;

    // Add algorithms to combination
    for (let i = 0; i < data.algorithmIds.length; i++) {
      await pool.query(
        `INSERT INTO combination_algorithms 
        (combination_id, algorithm_id, role, weight, sequence_order)
        VALUES (?, ?, ?, ?, ?)`,
        [
          combinationId,
          data.algorithmIds[i],
          data.roles && data.roles[i] ? data.roles[i] : null,
          data.weights && data.weights[i] ? data.weights[i] : 1.0,
          i
        ]
      );
    }

    const [combinations] = await pool.query(
      'SELECT * FROM algorithm_combinations WHERE id = ?',
      [combinationId]
    ) as any[];

    res.status(201).json(combinations[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Get recommended combinations for problem
router.get('/recommendations/problem/:problemId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();

    // Get problem details
    const [problems] = await pool.query(
      'SELECT domain, category FROM problems WHERE id = ? AND user_id = ?',
      [req.params.problemId, req.userId]
    ) as any[];

    if (problems.length === 0) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    // Find combinations that might work for this problem
    const [combinations] = await pool.query(
      `SELECT DISTINCT c.*, COUNT(ca.algorithm_id) as algorithm_count
      FROM algorithm_combinations c
      JOIN combination_algorithms ca ON c.id = ca.combination_id
      JOIN algorithms a ON ca.algorithm_id = a.id
      WHERE (a.domain LIKE ? OR a.domain LIKE ?)
      AND (c.user_id = ? OR c.user_id IS NULL OR c.is_recommended = TRUE)
      GROUP BY c.id
      ORDER BY c.effectiveness_score DESC, c.popularity_score DESC
      LIMIT 10`,
      [
        `%${problems[0].domain}%`,
        `%${problems[0].category}%`,
        req.userId
      ]
    ) as any[];

    res.json(combinations);
  } catch (error) {
    throw error;
  }
});

// Update combination effectiveness
router.patch('/:id/effectiveness', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { effectivenessScore } = req.body;
    if (effectivenessScore === undefined) {
      res.status(400).json({ error: 'effectivenessScore required' });
      return;
    }

    const pool = getPool();

    // Verify combination access
    const [combinations] = await pool.query(
      'SELECT id FROM algorithm_combinations WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [req.params.id, req.userId]
    ) as any[];

    if (combinations.length === 0) {
      res.status(404).json({ error: 'Combination not found' });
      return;
    }

    await pool.query(
      'UPDATE algorithm_combinations SET effectiveness_score = ?, popularity_score = popularity_score + 1 WHERE id = ?',
      [effectivenessScore, req.params.id]
    );

    const [updated] = await pool.query(
      'SELECT * FROM algorithm_combinations WHERE id = ?',
      [req.params.id]
    ) as any[];

    res.json(updated[0]);
  } catch (error) {
    throw error;
  }
});

export { router as combinationRouter };

