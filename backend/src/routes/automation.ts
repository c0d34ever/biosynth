import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { runAutomationNow, getSchedulerStatus } from '../services/scheduler.js';
import { generateDailyAlgorithms, autoSynthesizeAlgorithms, improveAlgorithms } from '../services/automation.js';
import { SYSTEM_USER } from '../constants.js';

const router = Router();

// Get automation status and statistics
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    
    // Check if user is admin
    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [req.userId]
    ) as any[];
    
    if (users.length === 0 || users[0].role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    
    // Get automation statistics
    const [stats] = await pool.query(
      `SELECT 
        task_type,
        status,
        COUNT(*) as count,
        MAX(created_at) as last_run
      FROM automation_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY task_type, status
      ORDER BY last_run DESC`
    ) as any[];
    
    // Get recent automation activities
    const [recent] = await pool.query(
      `SELECT 
        id, task_type, status, details, algorithm_id, created_at
      FROM automation_logs
      ORDER BY created_at DESC
      LIMIT 20`
    ) as any[];
    
    // Get system-generated algorithm count
    const [systemAlgos] = await pool.query(
      `SELECT COUNT(*) as count
      FROM algorithms a
      JOIN users u ON a.user_id = u.id
      WHERE u.email = ?
      AND a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [SYSTEM_USER.EMAIL]
    ) as any[];
    
    res.json({
      statistics: stats,
      recentActivities: recent.map((log: any) => ({
        ...log,
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
      })),
      systemGeneratedAlgorithms: systemAlgos[0]?.count || 0,
      schedulerEnabled: true
    });
  } catch (error) {
    throw error;
  }
});

// Get automation logs
router.get('/logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    
    // Check if user is admin
    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [req.userId]
    ) as any[];
    
    if (users.length === 0 || users[0].role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    
    const { taskType, status, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM automation_logs WHERE 1=1';
    const params: any[] = [];
    
    if (taskType) {
      query += ' AND task_type = ?';
      params.push(taskType);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const [logs] = await pool.query(query, params) as any[];
    
    res.json(logs.map((log: any) => ({
      ...log,
      details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
    })));
  } catch (error) {
    throw error;
  }
});

// Get scheduler status
router.get('/scheduler/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    
    // Check if user is admin
    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [req.userId]
    ) as any[];
    
    if (users.length === 0 || users[0].role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    
    const status = getSchedulerStatus();
    res.json(status);
  } catch (error: any) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ error: error.message || 'Failed to get scheduler status' });
  }
});

// Trigger manual automation (admin only)
router.post('/trigger', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    
    // Check if user is admin
    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [req.userId]
    ) as any[];
    
    if (users.length === 0 || users[0].role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    
    const { task } = req.body;
    
    // Run specific task or all tasks
    if (task === 'generate') {
      await generateDailyAlgorithms();
      res.json({ message: 'Daily algorithm generation completed' });
    } else if (task === 'synthesize') {
      await autoSynthesizeAlgorithms();
      res.json({ message: 'Auto-synthesis completed' });
    } else if (task === 'improve') {
      await improveAlgorithms();
      res.json({ message: 'Algorithm improvement completed' });
    } else if (task === 'all' || !task) {
      await runAutomationNow();
      res.json({ message: 'Full automation cycle completed' });
    } else {
      res.status(400).json({ error: 'Invalid task. Use: generate, synthesize, improve, or all' });
    }
  } catch (error: any) {
    console.error('Error triggering automation:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger automation' });
  }
});

// Get system-generated algorithms
router.get('/algorithms', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    
    const { limit = 20, offset = 0 } = req.query;
    
    const [algorithms] = await pool.query(
      `SELECT 
        a.id, a.name, a.inspiration, a.domain, a.description, a.principle,
        a.steps, a.applications, a.pseudo_code as pseudoCode, a.tags,
        a.type, a.parent_ids as parentIds, a.visibility, a.view_count as viewCount,
        a.like_count as likeCount, a.created_at as createdAt, a.updated_at as updatedAt
      FROM algorithms a
      JOIN users u ON a.user_id = u.id
      WHERE u.email = ?
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?`,
      [SYSTEM_USER.EMAIL, parseInt(limit as string), parseInt(offset as string)]
    ) as any[];
    
    // Helper function to safely parse JSON
    const safeParseJson = (value: any, defaultValue: any = null) => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'object') return value;
      if (typeof value !== 'string') return defaultValue;
      try {
        return JSON.parse(value);
      } catch {
        if (value.includes(',')) {
          return value.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        }
        return defaultValue;
      }
    };
    
    res.json(algorithms.map((algo: any) => ({
      ...algo,
      steps: safeParseJson(algo.steps, []),
      applications: safeParseJson(algo.applications, []),
      tags: safeParseJson(algo.tags, []),
      parentIds: safeParseJson(algo.parentIds, null)
    })));
  } catch (error) {
    throw error;
  }
});

export { router as automationRouter };

