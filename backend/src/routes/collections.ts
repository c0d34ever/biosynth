import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const collectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isPublic: z.boolean().optional()
});

// Get all collections for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [collections] = await pool.query(
      `SELECT c.*, COUNT(ca.algorithm_id) as algorithm_count
      FROM collections c
      LEFT JOIN collection_algorithms ca ON c.id = ca.collection_id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
      [req.userId]
    ) as any[];

    res.json(collections);
  } catch (error) {
    throw error;
  }
});

// Get public collections
router.get('/public', async (req, res: Response) => {
  try {
    const pool = getPool();
    const [collections] = await pool.query(
      `SELECT c.*, u.name as creator_name, COUNT(ca.algorithm_id) as algorithm_count
      FROM collections c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN collection_algorithms ca ON c.id = ca.collection_id
      WHERE c.is_public = TRUE
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 50`
    ) as any[];

    res.json(collections);
  } catch (error) {
    throw error;
  }
});

// Get single collection
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [collections] = await pool.query(
      `SELECT c.*, u.name as creator_name
      FROM collections c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ? AND (c.user_id = ? OR c.is_public = TRUE)`,
      [req.params.id, req.userId]
    ) as any[];

    if (collections.length === 0) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    const collection = collections[0];

    // Get algorithms
    const [algorithms] = await pool.query(
      `SELECT a.*, ca.added_at
      FROM algorithms a
      JOIN collection_algorithms ca ON a.id = ca.algorithm_id
      WHERE ca.collection_id = ?
      ORDER BY ca.added_at DESC`,
      [req.params.id]
    ) as any[];

    res.json({
      ...collection,
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

// Create collection
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = collectionSchema.parse(req.body);
    const pool = getPool();

    const [result] = await pool.query(
      'INSERT INTO collections (user_id, name, description, is_public) VALUES (?, ?, ?, ?)',
      [req.userId, data.name, data.description || null, data.isPublic || false]
    ) as any[];

    const [collections] = await pool.query(
      'SELECT * FROM collections WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json(collections[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Update collection
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = collectionSchema.partial().parse(req.body);
    const pool = getPool();

    const [existing] = await pool.query(
      'SELECT id FROM collections WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (existing.length === 0) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.isPublic !== undefined) { updates.push('is_public = ?'); values.push(data.isPublic); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(req.params.id);
    await pool.query(
      `UPDATE collections SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [collections] = await pool.query(
      'SELECT * FROM collections WHERE id = ?',
      [req.params.id]
    ) as any[];

    res.json(collections[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Delete collection
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM collections WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    res.json({ message: 'Collection deleted' });
  } catch (error) {
    throw error;
  }
});

// Add algorithm to collection
router.post('/:id/algorithms', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { algorithmId } = req.body;
    if (!algorithmId) {
      res.status(400).json({ error: 'algorithmId required' });
      return;
    }

    const pool = getPool();

    // Verify collection ownership
    const [collections] = await pool.query(
      'SELECT id FROM collections WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (collections.length === 0) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    // Verify algorithm exists and user has access
    const [algorithms] = await pool.query(
      'SELECT id FROM algorithms WHERE id = ? AND (user_id = ? OR visibility = "public")',
      [algorithmId, req.userId]
    ) as any[];

    if (algorithms.length === 0) {
      res.status(404).json({ error: 'Algorithm not found or not accessible' });
      return;
    }

    await pool.query(
      'INSERT IGNORE INTO collection_algorithms (collection_id, algorithm_id) VALUES (?, ?)',
      [req.params.id, algorithmId]
    );

    res.json({ message: 'Algorithm added to collection' });
  } catch (error) {
    throw error;
  }
});

// Remove algorithm from collection
router.delete('/:id/algorithms/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();

    // Verify collection ownership
    const [collections] = await pool.query(
      'SELECT id FROM collections WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (collections.length === 0) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    await pool.query(
      'DELETE FROM collection_algorithms WHERE collection_id = ? AND algorithm_id = ?',
      [req.params.id, req.params.algorithmId]
    );

    res.json({ message: 'Algorithm removed from collection' });
  } catch (error) {
    throw error;
  }
});

export { router as collectionRouter };

