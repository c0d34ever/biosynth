import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get user's notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { limit = 50, unreadOnly } = req.query;

    let query = `
      SELECT n.*, a.name as algorithm_name, u.name as related_user_name
      FROM notifications n
      LEFT JOIN algorithms a ON n.related_algorithm_id = a.id
      LEFT JOIN users u ON n.related_user_id = u.id
      WHERE n.user_id = ?
    `;

    const params: any[] = [req.userId];

    if (unreadOnly === 'true') {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ?';
    params.push(parseInt(limit as string));

    const [notifications] = await pool.query(query, params) as any[];

    res.json(notifications);
  } catch (error) {
    throw error;
  }
});

// Get unread count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.userId]
    ) as any[];

    res.json({ count: result[0].count });
  } catch (error) {
    throw error;
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    throw error;
  }
});

// Mark all as read
router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    throw error;
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    throw error;
  }
});

export { router as notificationRouter };

