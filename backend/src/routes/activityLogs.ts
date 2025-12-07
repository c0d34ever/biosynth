import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Get activity logs
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { 
      page = 1, 
      limit = 100, 
      userId, 
      actionType, 
      startDate, 
      endDate,
      search 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT 
        al.id,
        al.user_id,
        al.action_type as actionType,
        al.entity_type as entityType,
        al.entity_id as entityId,
        al.metadata as details,
        al.created_at as createdAt,
        u.email as userEmail,
        u.name as userName
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (userId) {
      query += ' AND al.user_id = ?';
      params.push(userId);
    }
    
    if (actionType) {
      query += ' AND al.action_type = ?';
      params.push(actionType);
    }
    
    if (startDate) {
      query += ' AND al.created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND al.created_at <= ?';
      params.push(endDate);
    }
    
    if (search) {
      query += ' AND (al.metadata LIKE ? OR u.email LIKE ? OR u.name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    
    const [logs] = await pool.query(query, params) as any[];
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM activity_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1';
    const countParams: any[] = [];
    
    if (userId) {
      countQuery += ' AND al.user_id = ?';
      countParams.push(userId);
    }
    
    if (actionType) {
      countQuery += ' AND al.action_type = ?';
      countParams.push(actionType);
    }
    
    if (startDate) {
      countQuery += ' AND al.created_at >= ?';
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ' AND al.created_at <= ?';
      countParams.push(endDate);
    }
    
    if (search) {
      countQuery += ' AND (al.metadata LIKE ? OR u.email LIKE ? OR u.name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    const [countResult] = await pool.query(countQuery, countParams) as any[];
    
    res.json({
      logs: logs.map((log: any) => ({
        ...log,
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
      })),
      total: countResult[0]?.total || 0,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch activity logs' });
  }
});

// Get activity statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    
    // Get action type counts
    const [actionStats] = await pool.query(
      `SELECT 
        action_type,
        COUNT(*) as count
      FROM activity_log
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY action_type
      ORDER BY count DESC`
    ) as any[];
    
    // Get daily activity for last 30 days
    const [dailyStats] = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM activity_log
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC`
    ) as any[];
    
    // Get top active users
    const [topUsers] = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.name,
        COUNT(*) as activity_count
      FROM activity_log al
      JOIN users u ON al.user_id = u.id
      WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY u.id, u.email, u.name
      ORDER BY activity_count DESC
      LIMIT 10`
    ) as any[];
    
    res.json({
      actionStats,
      dailyStats,
      topUsers
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch activity statistics' });
  }
});

// Clear old logs
router.delete('/old', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { days = 90 } = req.query;
    
    const [result] = await pool.query(
      `DELETE FROM activity_log 
       WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [Number(days)]
    ) as any[];
    
    res.json({ 
      message: `Deleted ${result.affectedRows} old log entries`,
      deletedCount: result.affectedRows
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to clear old logs' });
  }
});

export { router as activityLogsRouter };

