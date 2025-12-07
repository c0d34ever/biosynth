import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get user's favorites
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [algorithms] = await pool.query(
      `SELECT a.*, f.created_at as favorited_at
      FROM algorithms a
      JOIN favorites f ON a.id = f.algorithm_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC`,
      [req.userId]
    ) as any[];

    res.json(algorithms.map((algo: any) => ({
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

// Add to favorites
router.post('/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();

    // Verify algorithm exists and is accessible
    const [algorithms] = await pool.query(
      'SELECT id FROM algorithms WHERE id = ? AND (user_id = ? OR visibility = "public")',
      [req.params.algorithmId, req.userId]
    ) as any[];

    if (algorithms.length === 0) {
      res.status(404).json({ error: 'Algorithm not found or not accessible' });
      return;
    }

    await pool.query(
      'INSERT IGNORE INTO favorites (user_id, algorithm_id) VALUES (?, ?)',
      [req.userId, req.params.algorithmId]
    );

    res.json({ message: 'Added to favorites' });
  } catch (error) {
    throw error;
  }
});

// Remove from favorites
router.delete('/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM favorites WHERE user_id = ? AND algorithm_id = ?',
      [req.userId, req.params.algorithmId]
    ) as any[];

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Favorite not found' });
      return;
    }

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    throw error;
  }
});

// Check if algorithm is favorited
router.get('/:algorithmId/check', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [favorites] = await pool.query(
      'SELECT id FROM favorites WHERE user_id = ? AND algorithm_id = ?',
      [req.userId, req.params.algorithmId]
    ) as any[];

    res.json({ isFavorited: favorites.length > 0 });
  } catch (error) {
    throw error;
  }
});

export { router as favoriteRouter };

