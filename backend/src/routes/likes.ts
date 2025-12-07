import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Like algorithm
router.post('/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();

    // Verify algorithm exists and is accessible
    const [algorithms] = await pool.query(
      'SELECT id, user_id FROM algorithms WHERE id = ? AND (user_id = ? OR visibility = "public")',
      [req.params.algorithmId, req.userId]
    ) as any[];

    if (algorithms.length === 0) {
      res.status(404).json({ error: 'Algorithm not found or not accessible' });
      return;
    }

    // Check if already liked
    const [existing] = await pool.query(
      'SELECT id FROM algorithm_likes WHERE algorithm_id = ? AND user_id = ?',
      [req.params.algorithmId, req.userId]
    ) as any[];

    if (existing.length > 0) {
      res.status(400).json({ error: 'Already liked' });
      return;
    }

    // Add like
    await pool.query(
      'INSERT INTO algorithm_likes (algorithm_id, user_id) VALUES (?, ?)',
      [req.params.algorithmId, req.userId]
    );

    // Update like count
    await pool.query(
      'UPDATE algorithms SET like_count = like_count + 1 WHERE id = ?',
      [req.params.algorithmId]
    );

    // Create notification for algorithm owner (if not self)
    if (algorithms[0].user_id !== req.userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, related_algorithm_id, related_user_id)
        VALUES (?, 'system', 'Algorithm Liked', ?, ?, ?)`,
        [
          algorithms[0].user_id,
          'Someone liked your algorithm',
          req.params.algorithmId,
          req.userId
        ]
      );
    }

    res.json({ message: 'Algorithm liked' });
  } catch (error) {
    throw error;
  }
});

// Unlike algorithm
router.delete('/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM algorithm_likes WHERE algorithm_id = ? AND user_id = ?',
      [req.params.algorithmId, req.userId]
    ) as any[];

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Like not found' });
      return;
    }

    // Update like count
    await pool.query(
      'UPDATE algorithms SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?',
      [req.params.algorithmId]
    );

    res.json({ message: 'Algorithm unliked' });
  } catch (error) {
    throw error;
  }
});

// Get algorithm likes
router.get('/:algorithmId', async (req, res: Response) => {
  try {
    const pool = getPool();
    const [likes] = await pool.query(
      `SELECT al.*, u.name as user_name, u.email as user_email
      FROM algorithm_likes al
      JOIN users u ON al.user_id = u.id
      WHERE al.algorithm_id = ?
      ORDER BY al.created_at DESC`,
      [req.params.algorithmId]
    ) as any[];

    res.json(likes);
  } catch (error) {
    throw error;
  }
});

export { router as likeRouter };

