import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Get all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      `SELECT 
        id, email, name, role, created_at as createdAt, updated_at as updatedAt
      FROM users 
      ORDER BY created_at DESC`
    ) as any[];

    res.json(users);
  } catch (error) {
    throw error;
  }
});

// Get user statistics
router.get('/stats/users', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as adminUsers,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as newUsersLast7Days
      FROM users`
    ) as any[];

    res.json(stats[0]);
  } catch (error) {
    throw error;
  }
});

// Get algorithm statistics
router.get('/stats/algorithms', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as totalAlgorithms,
        COUNT(CASE WHEN type = 'generated' THEN 1 END) as generatedAlgorithms,
        COUNT(CASE WHEN type = 'hybrid' THEN 1 END) as hybridAlgorithms,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as newAlgorithmsLast7Days
      FROM algorithms`
    ) as any[];

    res.json(stats[0]);
  } catch (error) {
    throw error;
  }
});

// Get job statistics
router.get('/stats/jobs', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as totalJobs,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingJobs,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processingJobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedJobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failedJobs
      FROM jobs`
    ) as any[];

    res.json(stats[0]);
  } catch (error) {
    throw error;
  }
});

// Get all algorithms (admin view)
router.get('/algorithms', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [algorithms] = await pool.query(
      `SELECT 
        a.id, a.name, a.type, a.created_at as createdAt,
        u.email as userEmail, u.name as userName,
        (SELECT CAST(JSON_EXTRACT(result, '$.score') AS UNSIGNED)
         FROM algorithm_analysis 
         WHERE algorithm_id = a.id AND analysis_type = 'sanity'
         ORDER BY created_at DESC LIMIT 1) as score
      FROM algorithms a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 500`
    ) as any[];

    res.json(algorithms);
  } catch (error) {
    throw error;
  }
});

// Update user role
router.patch('/users/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const pool = getPool();
    const [result] = await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, req.params.id]
    ) as any[];

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'User role updated' });
  } catch (error) {
    throw error;
  }
});

// Delete user
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ? AND id != ?',
      [req.params.id, req.userId]
    ) as any[];

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'User not found or cannot delete yourself' });
      return;
    }

    res.json({ message: 'User deleted' });
  } catch (error) {
    throw error;
  }
});

// Get system statistics
router.get('/stats/system', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    
    // Get code generation stats
    const [codeStats] = await pool.query(
      'SELECT COUNT(*) as totalCodeGenerations FROM code_generations'
    ) as any[];
    
    // Get execution stats
    const [execStats] = await pool.query(
      'SELECT COUNT(*) as totalExecutions FROM code_executions'
    ) as any[];
    
    // Get export stats
    const [exportStats] = await pool.query(
      'SELECT COUNT(*) as totalExports FROM exports'
    ) as any[];
    
    // Determine system health
    const [failedJobs] = await pool.query(
      `SELECT COUNT(*) as count FROM jobs 
       WHERE status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`
    ) as any[];
    
    const health = failedJobs[0].count > 10 ? 'critical' : 
                   failedJobs[0].count > 5 ? 'warning' : 'healthy';
    
    res.json({
      totalCodeGenerations: codeStats[0]?.totalCodeGenerations || 0,
      totalExecutions: execStats[0]?.totalExecutions || 0,
      totalExports: exportStats[0]?.totalExports || 0,
      systemHealth: health
    });
  } catch (error) {
    throw error;
  }
});

// Get all jobs (admin view)
router.get('/jobs', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { limit = 100 } = req.query;
    
    const [jobs] = await pool.query(
      `SELECT 
        j.id, j.job_type as jobType, j.status, j.created_at as createdAt,
        j.completed_at as completedAt, j.error_message as errorMessage,
        u.email as userEmail
      FROM jobs j
      LEFT JOIN users u ON j.user_id = u.id
      ORDER BY j.created_at DESC
      LIMIT ?`,
      [Number(limit)]
    ) as any[];

    res.json(jobs);
  } catch (error) {
    throw error;
  }
});

// Cancel job
router.post('/jobs/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const jobId = parseInt(req.params.id);
    
    await pool.query(
      `UPDATE jobs SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND status IN ('pending', 'processing')`,
      [jobId]
    );
    
    res.json({ message: 'Job cancelled' });
  } catch (error) {
    throw error;
  }
});

// Retry failed job
router.post('/jobs/:id/retry', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const jobId = parseInt(req.params.id);
    
    await pool.query(
      `UPDATE jobs SET status = 'pending', error_message = NULL, completed_at = NULL 
       WHERE id = ? AND status = 'failed'`,
      [jobId]
    );
    
    res.json({ message: 'Job queued for retry' });
  } catch (error) {
    throw error;
  }
});

// Delete job
router.delete('/jobs/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const jobId = parseInt(req.params.id);
    
    await pool.query('DELETE FROM jobs WHERE id = ?', [jobId]);
    
    res.json({ message: 'Job deleted' });
  } catch (error) {
    throw error;
  }
});

// Delete algorithm (admin)
router.delete('/algorithms/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const algorithmId = parseInt(req.params.id);
    
    await pool.query('DELETE FROM algorithms WHERE id = ?', [algorithmId]);
    
    res.json({ message: 'Algorithm deleted' });
  } catch (error) {
    throw error;
  }
});

// Export data
router.get('/export/:type', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { type } = req.params;
    
    let data: any[] = [];
    let filename = '';
    
    if (type === 'users') {
      const [users] = await pool.query(
        'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
      ) as any[];
      data = users;
      filename = 'users-export.json';
    } else if (type === 'algorithms') {
      const [algorithms] = await pool.query(
        `SELECT a.*, u.email as userEmail, u.name as userName 
         FROM algorithms a 
         JOIN users u ON a.user_id = u.id 
         ORDER BY a.created_at DESC`
      ) as any[];
      data = algorithms;
      filename = 'algorithms-export.json';
    } else if (type === 'jobs') {
      const [jobs] = await pool.query(
        `SELECT j.*, u.email as userEmail 
         FROM jobs j 
         LEFT JOIN users u ON j.user_id = u.id 
         ORDER BY j.created_at DESC 
         LIMIT 1000`
      ) as any[];
      data = jobs;
      filename = 'jobs-export.json';
    } else {
      return res.status(400).json({ error: 'Invalid export type' });
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);
  } catch (error) {
    throw error;
  }
});

// Create user (admin only)
router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, password, role = 'user' } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const pool = getPool();
    
    // Check if email already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)',
      [email, name, hashedPassword, role]
    ) as any[];

    // Get created user
    const [users] = await pool.query(
      'SELECT id, email, name, role, created_at as createdAt FROM users WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json(users[0]);
  } catch (error: any) {
    console.error('[Admin] Error creating user:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// Update user fully (admin only)
router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id);
    const { email, name, password, role } = req.body;

    // Prevent updating yourself to non-admin
    if (userId === req.userId && role && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (email !== undefined) {
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

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (password) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(hashedPassword);
    }

    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    const [users] = await pool.query(
      'SELECT id, email, name, role, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
      [userId]
    ) as any[];

    res.json(users[0]);
  } catch (error: any) {
    console.error('[Admin] Error updating user:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

// Get algorithm by ID (admin)
router.get('/algorithms/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const algorithmId = parseInt(req.params.id);

    const [algorithms] = await pool.query(
      `SELECT 
        a.*, u.email as userEmail, u.name as userName
      FROM algorithms a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?`,
      [algorithmId]
    ) as any[];

    if (algorithms.length === 0) {
      return res.status(404).json({ error: 'Algorithm not found' });
    }

    res.json(algorithms[0]);
  } catch (error: any) {
    console.error('[Admin] Error fetching algorithm:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch algorithm' });
  }
});

// Update algorithm (admin)
router.put('/algorithms/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const algorithmId = parseInt(req.params.id);
    const { name, inspiration, domain, description, principle, steps, applications, pseudoCode, tags, type, visibility } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (inspiration !== undefined) {
      updates.push('inspiration = ?');
      params.push(inspiration);
    }
    if (domain !== undefined) {
      updates.push('domain = ?');
      params.push(domain);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (principle !== undefined) {
      updates.push('principle = ?');
      params.push(principle);
    }
    if (steps !== undefined) {
      updates.push('steps = ?');
      params.push(JSON.stringify(steps));
    }
    if (applications !== undefined) {
      updates.push('applications = ?');
      params.push(JSON.stringify(applications));
    }
    if (pseudoCode !== undefined) {
      updates.push('pseudo_code = ?');
      params.push(pseudoCode);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(tags));
    }
    if (type !== undefined) {
      updates.push('type = ?');
      params.push(type);
    }
    if (visibility !== undefined) {
      updates.push('visibility = ?');
      params.push(visibility);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(algorithmId);

    await pool.query(
      `UPDATE algorithms SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    const [algorithms] = await pool.query(
      `SELECT a.*, u.email as userEmail, u.name as userName
       FROM algorithms a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = ?`,
      [algorithmId]
    ) as any[];

    res.json(algorithms[0]);
  } catch (error: any) {
    console.error('[Admin] Error updating algorithm:', error);
    res.status(500).json({ error: error.message || 'Failed to update algorithm' });
  }
});

// Get job by ID (admin)
router.get('/jobs/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const jobId = parseInt(req.params.id);

    const [jobs] = await pool.query(
      `SELECT 
        j.*, u.email as userEmail, u.name as userName
      FROM jobs j
      LEFT JOIN users u ON j.user_id = u.id
      WHERE j.id = ?`,
      [jobId]
    ) as any[];

    if (jobs.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(jobs[0]);
  } catch (error: any) {
    console.error('[Admin] Error fetching job:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch job' });
  }
});

// Bulk delete users
router.post('/users/bulk-delete', async (req: AuthRequest, res: Response) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    const pool = getPool();
    
    // Prevent deleting yourself
    const filteredIds = userIds.filter((id: number) => id !== req.userId);
    
    if (filteredIds.length === 0) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const placeholders = filteredIds.map(() => '?').join(',');
    const [result] = await pool.query(
      `DELETE FROM users WHERE id IN (${placeholders})`,
      filteredIds
    ) as any[];

    res.json({ message: `${result.affectedRows} users deleted` });
  } catch (error: any) {
    console.error('[Admin] Error bulk deleting users:', error);
    res.status(500).json({ error: error.message || 'Failed to delete users' });
  }
});

// Bulk delete algorithms
router.post('/algorithms/bulk-delete', async (req: AuthRequest, res: Response) => {
  try {
    const { algorithmIds } = req.body;
    
    if (!Array.isArray(algorithmIds) || algorithmIds.length === 0) {
      return res.status(400).json({ error: 'Algorithm IDs array is required' });
    }

    const pool = getPool();
    const placeholders = algorithmIds.map(() => '?').join(',');
    const [result] = await pool.query(
      `DELETE FROM algorithms WHERE id IN (${placeholders})`,
      algorithmIds
    ) as any[];

    res.json({ message: `${result.affectedRows} algorithms deleted` });
  } catch (error: any) {
    console.error('[Admin] Error bulk deleting algorithms:', error);
    res.status(500).json({ error: error.message || 'Failed to delete algorithms' });
  }
});

// Bulk delete jobs
router.post('/jobs/bulk-delete', async (req: AuthRequest, res: Response) => {
  try {
    const { jobIds } = req.body;
    
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ error: 'Job IDs array is required' });
    }

    const pool = getPool();
    const placeholders = jobIds.map(() => '?').join(',');
    const [result] = await pool.query(
      `DELETE FROM jobs WHERE id IN (${placeholders})`,
      jobIds
    ) as any[];

    res.json({ message: `${result.affectedRows} jobs deleted` });
  } catch (error: any) {
    console.error('[Admin] Error bulk deleting jobs:', error);
    res.status(500).json({ error: error.message || 'Failed to delete jobs' });
  }
});

// Global Settings Management
// Get all global settings
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [settings] = await pool.query(
      `SELECT 
        setting_key as key,
        setting_value as value,
        description,
        updated_by,
        updated_at as updatedAt
      FROM global_settings 
      ORDER BY setting_key`
    ) as any[];

    res.json(settings);
  } catch (error: any) {
    console.error('[Admin] Error fetching global settings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch global settings' });
  }
});

// Get specific global setting
router.get('/settings/:key', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [settings] = await pool.query(
      `SELECT 
        setting_key as key,
        setting_value as value,
        description,
        updated_by,
        updated_at as updatedAt
      FROM global_settings 
      WHERE setting_key = ?`,
      [req.params.key]
    ) as any[];

    if (settings.length === 0) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }

    res.json(settings[0]);
  } catch (error: any) {
    console.error('[Admin] Error fetching global setting:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch global setting' });
  }
});

// Update global setting
router.put('/settings/:key', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { value, description } = req.body;

    if (value === undefined) {
      res.status(400).json({ error: 'Setting value is required' });
      return;
    }

    // Check if setting exists
    const [existing] = await pool.query(
      'SELECT id FROM global_settings WHERE setting_key = ?',
      [req.params.key]
    ) as any[];

    if (existing.length === 0) {
      // Create new setting
      await pool.query(
        `INSERT INTO global_settings (setting_key, setting_value, description, updated_by)
         VALUES (?, ?, ?, ?)`,
        [req.params.key, value, description || null, req.userId]
      );
    } else {
      // Update existing setting
      await pool.query(
        `UPDATE global_settings 
         SET setting_value = ?, 
             description = COALESCE(?, description),
             updated_by = ?,
             updated_at = NOW()
         WHERE setting_key = ?`,
        [value, description, req.userId, req.params.key]
      );
    }

    res.json({ 
      message: 'Setting updated successfully',
      key: req.params.key,
      value: value
    });
  } catch (error: any) {
    console.error('[Admin] Error updating global setting:', error);
    res.status(500).json({ error: error.message || 'Failed to update global setting' });
  }
});

// Delete global setting (restores to default if it's a system setting)
router.delete('/settings/:key', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    
    // Don't allow deletion of critical system settings
    const systemSettings = ['gemini_api_key'];
    if (systemSettings.includes(req.params.key)) {
      res.status(400).json({ error: 'Cannot delete system settings. Use PUT to update instead.' });
      return;
    }

    await pool.query(
      'DELETE FROM global_settings WHERE setting_key = ?',
      [req.params.key]
    );

    res.json({ message: 'Setting deleted successfully' });
  } catch (error: any) {
    console.error('[Admin] Error deleting global setting:', error);
    res.status(500).json({ error: error.message || 'Failed to delete global setting' });
  }
});

export { router as adminRouter };

