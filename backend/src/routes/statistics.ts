import { Router } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get overall statistics
router.get('/overview', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const pool = getPool();
    const userId = req.userId;

    // Total algorithms
    const [algorithmsCount] = await pool.query(
      'SELECT COUNT(*) as count FROM algorithms WHERE user_id = ?',
      [userId]
    ) as any[];

    // Total jobs
    const [jobsCount] = await pool.query(
      'SELECT COUNT(*) as count FROM jobs WHERE user_id = ?',
      [userId]
    ) as any[];

    // Successful jobs
    const [successfulJobs] = await pool.query(
      'SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND status = ?',
      [userId, 'completed']
    ) as any[];

    // Failed jobs
    const [failedJobs] = await pool.query(
      'SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND status = ?',
      [userId, 'failed']
    ) as any[];

    // Average algorithm score
    const [avgScore] = await pool.query(`
      SELECT AVG(CAST(JSON_EXTRACT(result, '$.score') AS DECIMAL(5,2))) as avg_score
      FROM algorithm_analysis
      WHERE algorithm_id IN (SELECT id FROM algorithms WHERE user_id = ?)
      AND analysis_type = 'sanity'
      AND JSON_EXTRACT(result, '$.score') IS NOT NULL
    `, [userId]) as any[];

    // Algorithms by type
    const [byType] = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM algorithms
      WHERE user_id = ?
      GROUP BY type
    `, [userId]) as any[];

    // Recent activity (last 7 days)
    const [recentActivity] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM algorithms
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [userId]) as any[];

    // Top tags - fetch all algorithms and process tags in JavaScript
    const [algorithmsWithTags] = await pool.query(
      'SELECT tags FROM algorithms WHERE user_id = ? AND tags IS NOT NULL',
      [userId]
    ) as any[];

    const tagCounts: Record<string, number> = {};
    algorithmsWithTags.forEach((row: any) => {
      let tags: string[] = [];
      try {
        tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
        if (Array.isArray(tags)) {
          tags.forEach((tag: string) => {
            if (tag && typeof tag === 'string') {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
          });
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      algorithms: {
        total: algorithmsCount[0]?.count || 0,
        byType: byType.reduce((acc: any, row: any) => {
          acc[row.type] = row.count;
          return acc;
        }, {})
      },
      jobs: {
        total: jobsCount[0]?.count || 0,
        successful: successfulJobs[0]?.count || 0,
        failed: failedJobs[0]?.count || 0,
        successRate: jobsCount[0]?.count > 0 
          ? ((successfulJobs[0]?.count || 0) / jobsCount[0].count * 100).toFixed(1)
          : '0.0'
      },
      scores: {
        average: avgScore[0]?.avg_score ? parseFloat(avgScore[0].avg_score).toFixed(1) : null
      },
      activity: {
        last7Days: recentActivity
      },
      topTags: topTags
    });
  } catch (error: any) {
    console.error('[Statistics] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch statistics' });
  }
});

// Get algorithm statistics
router.get('/algorithms', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const pool = getPool();
    const userId = req.userId;

    const [stats] = await pool.query(`
      SELECT 
        a.id,
        a.name,
        a.type,
        a.created_at,
        a.updated_at,
        COALESCE(JSON_EXTRACT(aa.result, '$.score'), 0) as score,
        COALESCE(JSON_EXTRACT(aa.result, '$.verdict'), 'Not analyzed') as verdict,
        (SELECT COUNT(*) FROM algorithm_versions WHERE algorithm_id = a.id) as version_count,
        (SELECT COUNT(*) FROM comments WHERE algorithm_id = a.id) as comment_count,
        (SELECT COUNT(*) FROM algorithm_likes WHERE algorithm_id = a.id) as like_count,
        (SELECT COUNT(*) FROM favorites WHERE algorithm_id = a.id) as favorite_count
      FROM algorithms a
      LEFT JOIN algorithm_analysis aa ON a.id = aa.algorithm_id AND aa.analysis_type = 'sanity'
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `, [userId]) as any[];

    res.json(stats);
  } catch (error: any) {
    console.error('[Statistics] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch algorithm statistics' });
  }
});

// Get job statistics
router.get('/jobs', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const pool = getPool();
    const userId = req.userId;
    const { status, jobType, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        id,
        job_type,
        status,
        input_data,
        result_data,
        error_message,
        created_at,
        updated_at,
        completed_at,
        TIMESTAMPDIFF(SECOND, created_at, COALESCE(completed_at, updated_at)) as duration_seconds
      FROM jobs
      WHERE user_id = ?
    `;

    const params: any[] = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (jobType) {
      query += ' AND job_type = ?';
      params.push(jobType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [jobs] = await pool.query(query, params) as any[];

    // Get totals
    let countQuery = 'SELECT COUNT(*) as total FROM jobs WHERE user_id = ?';
    const countParams: any[] = [userId];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (jobType) {
      countQuery += ' AND job_type = ?';
      countParams.push(jobType);
    }

    const [countResult] = await pool.query(countQuery, countParams) as any[];

    res.json({
      jobs,
      total: countResult[0]?.total || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error: any) {
    console.error('[Statistics] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch job statistics' });
  }
});

// Get analytics trends
router.get('/trends', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const pool = getPool();
    const userId = req.userId;
    const { days = 30 } = req.query;

    // Algorithm creation trend
    const [creationTrend] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM algorithms
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [userId, parseInt(days)]) as any[];

    // Job completion trend
    const [jobTrend] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        status,
        COUNT(*) as count
      FROM jobs
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at), status
      ORDER BY date ASC
    `, [userId, parseInt(days)]) as any[];

    // Score trend
    const [scoreTrend] = await pool.query(`
      SELECT 
        DATE(aa.created_at) as date,
        AVG(CAST(JSON_EXTRACT(aa.result, '$.score') AS DECIMAL(5,2))) as avg_score
      FROM algorithm_analysis aa
      JOIN algorithms a ON aa.algorithm_id = a.id
      WHERE a.user_id = ? 
      AND aa.analysis_type = 'sanity'
      AND aa.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      AND JSON_EXTRACT(aa.result, '$.score') IS NOT NULL
      GROUP BY DATE(aa.created_at)
      ORDER BY date ASC
    `, [userId, parseInt(days)]) as any[];

    res.json({
      creationTrend,
      jobTrend,
      scoreTrend
    });
  } catch (error: any) {
    console.error('[Statistics] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trends' });
  }
});

export default router;

