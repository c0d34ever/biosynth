import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const commentSchema = z.object({
  content: z.string().min(1),
  parentId: z.number().optional()
});

// Get comments for algorithm
router.get('/algorithm/:algorithmId', async (req, res: Response) => {
  try {
    const pool = getPool();
    const [comments] = await pool.query(
      `SELECT c.*, u.name as user_name, u.email as user_email
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.algorithm_id = ?
      ORDER BY c.created_at ASC`,
      [req.params.algorithmId]
    ) as any[];

    // Organize into tree structure
    const commentMap = new Map();
    const rootComments: any[] = [];

    comments.forEach((comment: any) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    comments.forEach((comment: any) => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      } else {
        rootComments.push(commentMap.get(comment.id));
      }
    });

    res.json(rootComments);
  } catch (error) {
    throw error;
  }
});

// Create comment
router.post('/algorithm/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = commentSchema.parse(req.body);
    const pool = getPool();

    // Verify algorithm exists and is accessible
    const [algorithms] = await pool.query(
      'SELECT id FROM algorithms WHERE id = ? AND (user_id = ? OR visibility IN ("public", "unlisted"))',
      [req.params.algorithmId, req.userId]
    ) as any[];

    if (algorithms.length === 0) {
      res.status(404).json({ error: 'Algorithm not found or not accessible' });
      return;
    }

    // If parent comment, verify it exists
    if (data.parentId) {
      const [parents] = await pool.query(
        'SELECT id FROM comments WHERE id = ? AND algorithm_id = ?',
        [data.parentId, req.params.algorithmId]
      ) as any[];

      if (parents.length === 0) {
        res.status(404).json({ error: 'Parent comment not found' });
        return;
      }
    }

    const [result] = await pool.query(
      'INSERT INTO comments (algorithm_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [req.params.algorithmId, req.userId, data.parentId || null, data.content]
    ) as any[];

    // Get created comment with user info
    const [comments] = await pool.query(
      `SELECT c.*, u.name as user_name, u.email as user_email
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?`,
      [result.insertId]
    ) as any[];

    // Create notification for algorithm owner
    if (req.userId) {
      const [algoOwners] = await pool.query(
        'SELECT user_id FROM algorithms WHERE id = ?',
        [req.params.algorithmId]
      ) as any[];

      if (algoOwners.length > 0 && algoOwners[0].user_id !== req.userId) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, related_algorithm_id, related_user_id)
          VALUES (?, 'comment', 'New Comment', ?, ?, ?)`,
          [
            algoOwners[0].user_id,
            `Someone commented on your algorithm`,
            req.params.algorithmId,
            req.userId
          ]
        );
      }
    }

    res.status(201).json({ ...comments[0], replies: [] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Update comment
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = commentSchema.partial().parse(req.body);
    const pool = getPool();

    const [existing] = await pool.query(
      'SELECT id FROM comments WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (existing.length === 0) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    if (data.content) {
      await pool.query(
        'UPDATE comments SET content = ?, is_edited = TRUE WHERE id = ?',
        [data.content, req.params.id]
      );
    }

    const [comments] = await pool.query(
      `SELECT c.*, u.name as user_name, u.email as user_email
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?`,
      [req.params.id]
    ) as any[];

    res.json(comments[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Delete comment
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM comments WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    throw error;
  }
});

export { router as commentRouter };

