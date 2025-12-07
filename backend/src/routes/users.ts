import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { page = 1, limit = 50, search = '', role = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT 
        id,
        email,
        name,
        role,
        created_at,
        updated_at,
        (SELECT COUNT(*) FROM algorithms WHERE user_id = users.id) as algorithm_count,
        (SELECT COUNT(*) FROM jobs WHERE user_id = users.id) as job_count
      FROM users
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ' AND (email LIKE ? OR name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [users] = await pool.query(query, params) as any[];

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams: any[] = [];

    if (search) {
      countQuery += ' AND (email LIKE ? OR name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      countQuery += ' AND role = ?';
      countParams.push(role);
    }

    const [countResult] = await pool.query(countQuery, countParams) as any[];

    res.json({
      users,
      total: countResult[0]?.total || 0,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error: any) {
    console.error('[Users] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
    const requestingUserId = req.userId;

    // Users can only view their own profile unless admin
    if (userId !== requestingUserId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [users] = await pool.query(
      `SELECT 
        id,
        email,
        name,
        role,
        created_at,
        updated_at
      FROM users
      WHERE id = ?`,
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user statistics
    const [algorithms] = await pool.query(
      'SELECT COUNT(*) as count FROM algorithms WHERE user_id = ?',
      [userId]
    ) as any[];

    const [jobs] = await pool.query(
      'SELECT COUNT(*) as count FROM jobs WHERE user_id = ?',
      [userId]
    ) as any[];

    const [completedJobs] = await pool.query(
      'SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND status = ?',
      [userId, 'completed']
    ) as any[];

    res.json({
      ...users[0],
      statistics: {
        algorithms: algorithms[0]?.count || 0,
        jobs: jobs[0]?.count || 0,
        completedJobs: completedJobs[0]?.count || 0
      }
    });
  } catch (error: any) {
    console.error('[Users] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

// Update user (own profile or admin)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
    const requestingUserId = req.userId;
    const { name, email, password, role } = req.body;

    // Users can only update their own profile unless admin
    if (userId !== requestingUserId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only admins can change roles
    if (role && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change user roles' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (email !== undefined) {
      // Check if email is already taken
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      ) as any[];

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      updates.push('email = ?');
      params.push(email);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(hashedPassword);
    }

    if (role && req.userRole === 'admin') {
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated user
    const [users] = await pool.query(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    ) as any[];

    res.json(users[0]);
  } catch (error: any) {
    console.error('[Users] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);

    // Prevent deleting yourself
    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('[Users] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

export default router;

