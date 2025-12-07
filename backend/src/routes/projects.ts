import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

// Get all projects for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [projects] = await pool.query(
      `SELECT p.*, COUNT(pa.algorithm_id) as algorithm_count
      FROM projects p
      LEFT JOIN project_algorithms pa ON p.id = pa.project_id
      WHERE p.user_id = ? AND p.is_archived = FALSE
      GROUP BY p.id
      ORDER BY p.created_at DESC`,
      [req.userId]
    ) as any[];

    res.json(projects);
  } catch (error) {
    throw error;
  }
});

// Get single project with algorithms
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [projects] = await pool.query(
      `SELECT * FROM projects WHERE id = ? AND user_id = ?`,
      [req.params.id, req.userId]
    ) as any[];

    if (projects.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const project = projects[0];

    // Get algorithms in project
    const [algorithms] = await pool.query(
      `SELECT a.*, pa.added_at
      FROM algorithms a
      JOIN project_algorithms pa ON a.id = pa.algorithm_id
      WHERE pa.project_id = ?
      ORDER BY pa.added_at DESC`,
      [req.params.id]
    ) as any[];

    res.json({
      ...project,
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

// Create project
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = projectSchema.parse(req.body);
    const pool = getPool();

    const [result] = await pool.query(
      'INSERT INTO projects (user_id, name, description, color) VALUES (?, ?, ?, ?)',
      [req.userId, data.name, data.description || null, data.color || '#10b981']
    ) as any[];

    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json(projects[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Update project
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = projectSchema.partial().parse(req.body);
    const pool = getPool();

    const [existing] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (existing.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.color) { updates.push('color = ?'); values.push(data.color); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(req.params.id);
    await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ?',
      [req.params.id]
    ) as any[];

    res.json(projects[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Delete project
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ message: 'Project deleted' });
  } catch (error) {
    throw error;
  }
});

// Add algorithm to project
router.post('/:id/algorithms', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { algorithmId } = req.body;
    if (!algorithmId) {
      res.status(400).json({ error: 'algorithmId required' });
      return;
    }

    const pool = getPool();

    // Verify project ownership
    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (projects.length === 0) {
      res.status(404).json({ error: 'Project not found' });
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
      'INSERT IGNORE INTO project_algorithms (project_id, algorithm_id) VALUES (?, ?)',
      [req.params.id, algorithmId]
    );

    res.json({ message: 'Algorithm added to project' });
  } catch (error) {
    throw error;
  }
});

// Remove algorithm from project
router.delete('/:id/algorithms/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();

    // Verify project ownership
    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (projects.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    await pool.query(
      'DELETE FROM project_algorithms WHERE project_id = ? AND algorithm_id = ?',
      [req.params.id, req.params.algorithmId]
    );

    res.json({ message: 'Algorithm removed from project' });
  } catch (error) {
    throw error;
  }
});

export { router as projectRouter };

