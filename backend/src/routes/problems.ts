import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const problemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().optional(),
  domain: z.string().optional(),
  complexity: z.enum(['simple', 'moderate', 'complex', 'very_complex']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

// Get all problems for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { status, category, priority } = req.query;

    let query = `
      SELECT p.*, 
        COUNT(DISTINCT pa.algorithm_id) as algorithm_count,
        COUNT(DISTINCT ps.id) as solution_count
      FROM problems p
      LEFT JOIN problem_algorithms pa ON p.id = pa.problem_id
      LEFT JOIN problem_solutions ps ON p.id = ps.problem_id
      WHERE p.user_id = ?
    `;

    const params: any[] = [req.userId];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND p.category = ?';
      params.push(category);
    }

    if (priority) {
      query += ' AND p.priority = ?';
      params.push(priority);
    }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC';

    const [problems] = await pool.query(query, params) as any[];

    res.json(problems);
  } catch (error) {
    throw error;
  }
});

// Get single problem with algorithms and solutions
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [problems] = await pool.query(
      'SELECT * FROM problems WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (problems.length === 0) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    const problem = problems[0];

    // Get algorithms
    const [algorithms] = await pool.query(
      `SELECT a.*, pa.role, pa.sequence_order, pa.effectiveness_score, pa.notes
      FROM algorithms a
      JOIN problem_algorithms pa ON a.id = pa.algorithm_id
      WHERE pa.problem_id = ?
      ORDER BY pa.sequence_order ASC`,
      [req.params.id]
    ) as any[];

    // Get solutions
    const [solutions] = await pool.query(
      `SELECT ps.*, ac.name as combination_name
      FROM problem_solutions ps
      LEFT JOIN algorithm_combinations ac ON ps.algorithm_combination_id = ac.id
      WHERE ps.problem_id = ?
      ORDER BY ps.success_rate DESC`,
      [req.params.id]
    ) as any[];

    res.json({
      ...problem,
      algorithms: algorithms.map((algo: any) => ({
        ...algo,
        steps: JSON.parse(algo.steps),
        applications: JSON.parse(algo.applications),
        tags: JSON.parse(algo.tags),
        parentIds: algo.parentIds ? JSON.parse(algo.parentIds) : null
      })),
      solutions
    });
  } catch (error) {
    throw error;
  }
});

// Create problem
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = problemSchema.parse(req.body);
    const pool = getPool();

    const [result] = await pool.query(
      `INSERT INTO problems (user_id, title, description, category, domain, complexity, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        data.title,
        data.description,
        data.category || null,
        data.domain || null,
        data.complexity || 'moderate',
        data.priority || 'medium'
      ]
    ) as any[];

    const [problems] = await pool.query(
      'SELECT * FROM problems WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json(problems[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Update problem
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = problemSchema.partial().parse(req.body);
    const pool = getPool();

    const [existing] = await pool.query(
      'SELECT id FROM problems WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (existing.length === 0) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title) { updates.push('title = ?'); values.push(data.title); }
    if (data.description) { updates.push('description = ?'); values.push(data.description); }
    if (data.category !== undefined) { updates.push('category = ?'); values.push(data.category); }
    if (data.domain) { updates.push('domain = ?'); values.push(data.domain); }
    if (data.complexity) { updates.push('complexity = ?'); values.push(data.complexity); }
    if (data.priority) { updates.push('priority = ?'); values.push(data.priority); }
    if (req.body.status) {
      updates.push('status = ?');
      values.push(req.body.status);
      if (req.body.status === 'solved') {
        updates.push('solved_at = NOW()');
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(req.params.id);
    await pool.query(
      `UPDATE problems SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [problems] = await pool.query(
      'SELECT * FROM problems WHERE id = ?',
      [req.params.id]
    ) as any[];

    res.json(problems[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Delete problem
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM problems WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    res.json({ message: 'Problem deleted' });
  } catch (error) {
    throw error;
  }
});

// Add algorithm to problem
router.post('/:id/algorithms', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { algorithmId, role, sequenceOrder, effectivenessScore, notes } = req.body;
    if (!algorithmId) {
      res.status(400).json({ error: 'algorithmId required' });
      return;
    }

    const pool = getPool();

    // Verify problem ownership
    const [problems] = await pool.query(
      'SELECT id FROM problems WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (problems.length === 0) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    // Verify algorithm ownership
    const [algorithms] = await pool.query(
      'SELECT id FROM algorithms WHERE id = ? AND user_id = ?',
      [algorithmId, req.userId]
    ) as any[];

    if (algorithms.length === 0) {
      res.status(404).json({ error: 'Algorithm not found' });
      return;
    }

    await pool.query(
      `INSERT INTO problem_algorithms 
      (problem_id, algorithm_id, role, sequence_order, effectiveness_score, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      role = VALUES(role),
      sequence_order = VALUES(sequence_order),
      effectiveness_score = VALUES(effectiveness_score),
      notes = VALUES(notes)`,
      [
        req.params.id,
        algorithmId,
        role || 'primary',
        sequenceOrder || 0,
        effectivenessScore || null,
        notes || null
      ]
    );

    res.json({ message: 'Algorithm added to problem' });
  } catch (error) {
    throw error;
  }
});

// Remove algorithm from problem
router.delete('/:id/algorithms/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();

    // Verify problem ownership
    const [problems] = await pool.query(
      'SELECT id FROM problems WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (problems.length === 0) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    await pool.query(
      'DELETE FROM problem_algorithms WHERE problem_id = ? AND algorithm_id = ?',
      [req.params.id, req.params.algorithmId]
    );

    res.json({ message: 'Algorithm removed from problem' });
  } catch (error) {
    throw error;
  }
});

// Get recommended algorithms for problem
router.get('/:id/recommendations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();

    // Get problem details
    const [problems] = await pool.query(
      'SELECT domain, category FROM problems WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (problems.length === 0) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    const problem = problems[0];

    // Find algorithms matching problem domain/category
    const [recommendations] = await pool.query(
      `SELECT a.*, 
        (CASE 
          WHEN a.domain LIKE ? THEN 10
          WHEN a.domain LIKE ? THEN 5
          ELSE 0
        END) as relevance_score
      FROM algorithms a
      WHERE (a.domain LIKE ? OR a.domain LIKE ?)
      AND (a.user_id = ? OR a.visibility = 'public')
      ORDER BY relevance_score DESC, a.like_count DESC
      LIMIT 10`,
      [
        `%${problem.domain}%`,
        `%${problem.category}%`,
        `%${problem.domain}%`,
        `%${problem.category}%`,
        req.userId
      ]
    ) as any[];

    res.json(recommendations.map((algo: any) => ({
      ...algo,
      steps: JSON.parse(algo.steps),
      applications: JSON.parse(algo.applications),
      tags: JSON.parse(algo.tags),
      parentIds: algo.parentIds ? JSON.parse(algo.parentIds) : null
    })));
  } catch (error) {
    throw error;
  }
});

export { router as problemRouter };

