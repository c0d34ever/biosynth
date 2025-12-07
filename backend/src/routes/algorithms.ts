import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper function to safely parse JSON
const safeParseJson = (value: any, defaultValue: any = null) => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'object') return value; // Already parsed
  if (typeof value !== 'string') return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    // If parsing fails, try to handle as comma-separated string
    if (value.includes(',')) {
      return value.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }
    return defaultValue;
  }
};

const algorithmSchema = z.object({
  name: z.string(),
  inspiration: z.string(),
  domain: z.string(),
  description: z.string(),
  principle: z.string(),
  steps: z.array(z.string()),
  applications: z.array(z.string()),
  pseudoCode: z.string(),
  tags: z.array(z.string()),
  type: z.enum(['generated', 'hybrid']),
  parentIds: z.array(z.number()).optional(),
  visibility: z.enum(['private', 'public', 'unlisted']).optional()
});

// Get all algorithms for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { visibility, type, search } = req.query;

    let query = `
      SELECT 
        a.id, a.name, a.inspiration, a.domain, a.description, a.principle,
        a.steps, a.applications, a.pseudo_code as pseudoCode, a.tags,
        a.type, a.parent_ids as parentIds, a.visibility, a.view_count as viewCount,
        a.like_count as likeCount, a.created_at as createdAt, a.updated_at as updatedAt,
        (SELECT COUNT(*) FROM favorites f WHERE f.algorithm_id = a.id AND f.user_id = ?) as isFavorited,
        (SELECT COUNT(*) FROM algorithm_likes al WHERE al.algorithm_id = a.id AND al.user_id = ?) as isLiked
      FROM algorithms a
      WHERE a.user_id = ?
    `;

    const params: any[] = [req.userId, req.userId, req.userId];

    if (visibility) {
      query += ' AND a.visibility = ?';
      params.push(visibility);
    }

    if (type) {
      query += ' AND a.type = ?';
      params.push(type);
    }

    if (search) {
      query += ' AND (a.name LIKE ? OR a.domain LIKE ? OR a.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY a.created_at DESC';

    const [algorithms] = await pool.query(query, params) as any[];

    // Helper function to safely parse JSON
    const safeParseJson = (value: any, defaultValue: any = null) => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'object') return value; // Already parsed
      if (typeof value !== 'string') return defaultValue;
      try {
        return JSON.parse(value);
      } catch {
        // If parsing fails, try to handle as comma-separated string
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
      parentIds: safeParseJson(algo.parentIds, null),
      isFavorited: algo.isFavorited > 0,
      isLiked: algo.isLiked > 0
    })));
  } catch (error) {
    throw error;
  }
});

// Get single algorithm
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [algorithms] = await pool.query(
      `SELECT 
        id, name, inspiration, domain, description, principle,
        steps, applications, pseudo_code as pseudoCode, tags,
        type, parent_ids as parentIds, created_at as createdAt, updated_at as updatedAt
      FROM algorithms 
      WHERE id = ? AND user_id = ?`,
      [req.params.id, req.userId]
    ) as any[];

    if (algorithms.length === 0) {
      res.status(404).json({ error: 'Algorithm not found' });
      return;
    }

    const algo = algorithms[0];

    // Fetch latest analysis results from database (one per type)
    const [analyses] = await pool.query(
      `SELECT aa1.analysis_type, aa1.result, aa1.created_at
      FROM algorithm_analysis aa1
      INNER JOIN (
        SELECT algorithm_id, analysis_type, MAX(created_at) as max_created_at
        FROM algorithm_analysis
        WHERE algorithm_id = ?
        GROUP BY algorithm_id, analysis_type
      ) aa2 ON aa1.algorithm_id = aa2.algorithm_id 
        AND aa1.analysis_type = aa2.analysis_type 
        AND aa1.created_at = aa2.max_created_at
      WHERE aa1.algorithm_id = ?`,
      [req.params.id, req.params.id]
    ) as any[];

    // Organize analysis results by type
    const analysis: any = {};
    let latestTimestamp = 0;
    analyses.forEach((a: any) => {
      const result = safeParseJson(a.result, null);
      const timestamp = new Date(a.created_at).getTime();
      if (timestamp > latestTimestamp) {
        latestTimestamp = timestamp;
      }
      
      if (a.analysis_type === 'sanity') {
        analysis.sanity = result;
      } else if (a.analysis_type === 'blind_spot') {
        analysis.blindSpots = result;
      } else if (a.analysis_type === 'extension') {
        analysis.extensions = result;
      }
    });

    // Set lastRun timestamp if any analysis exists
    if (latestTimestamp > 0) {
      analysis.lastRun = latestTimestamp;
    }

    res.json({
      ...algo,
      steps: safeParseJson(algo.steps, []),
      applications: safeParseJson(algo.applications, []),
      tags: safeParseJson(algo.tags, []),
      parentIds: safeParseJson(algo.parentIds, null),
      analysis: Object.keys(analysis).length > 0 ? analysis : undefined
    });
  } catch (error) {
    throw error;
  }
});

// Create algorithm
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = algorithmSchema.parse(req.body);
    const pool = getPool();

    const [result] = await pool.query(
      `INSERT INTO algorithms 
      (user_id, name, inspiration, domain, description, principle, 
       steps, applications, pseudo_code, tags, type, parent_ids, visibility)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        data.name,
        data.inspiration,
        data.domain,
        data.description,
        data.principle,
        JSON.stringify(data.steps),
        JSON.stringify(data.applications),
        data.pseudoCode,
        JSON.stringify(data.tags),
        data.type,
        data.parentIds ? JSON.stringify(data.parentIds) : null,
        data.visibility || 'private'
      ]
    ) as any[];

    const [algorithms] = await pool.query(
      `SELECT 
        id, name, inspiration, domain, description, principle,
        steps, applications, pseudo_code as pseudoCode, tags,
        type, parent_ids as parentIds, created_at as createdAt, updated_at as updatedAt
      FROM algorithms 
      WHERE id = ?`,
      [result.insertId]
    ) as any[];

    const algo = algorithms[0];
    res.status(201).json({
      ...algo,
      steps: safeParseJson(algo.steps, []),
      applications: safeParseJson(algo.applications, []),
      tags: safeParseJson(algo.tags, []),
      parentIds: safeParseJson(algo.parentIds, null)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Update algorithm
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = algorithmSchema.partial().parse(req.body);
    const pool = getPool();

    // Check ownership
    const [existing] = await pool.query(
      'SELECT id FROM algorithms WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (existing.length === 0) {
      res.status(404).json({ error: 'Algorithm not found' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name) { updates.push('name = ?'); values.push(data.name); }
    if (data.description) { updates.push('description = ?'); values.push(data.description); }
    if (data.principle) { updates.push('principle = ?'); values.push(data.principle); }
    if (data.steps) { updates.push('steps = ?'); values.push(JSON.stringify(data.steps)); }
    if (data.applications) { updates.push('applications = ?'); values.push(JSON.stringify(data.applications)); }
    if (data.pseudoCode) { updates.push('pseudo_code = ?'); values.push(data.pseudoCode); }
    if (data.tags) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(req.params.id);
    await pool.query(
      `UPDATE algorithms SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [algorithms] = await pool.query(
      `SELECT 
        id, name, inspiration, domain, description, principle,
        steps, applications, pseudo_code as pseudoCode, tags,
        type, parent_ids as parentIds, created_at as createdAt, updated_at as updatedAt
      FROM algorithms 
      WHERE id = ?`,
      [req.params.id]
    ) as any[];

    const algo = algorithms[0];
    res.json({
      ...algo,
      steps: safeParseJson(algo.steps, []),
      applications: safeParseJson(algo.applications, []),
      tags: safeParseJson(algo.tags, []),
      parentIds: safeParseJson(algo.parentIds, null)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Delete algorithm
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM algorithms WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Algorithm not found' });
      return;
    }

    res.json({ message: 'Algorithm deleted' });
  } catch (error) {
    throw error;
  }
});

export { router as algorithmRouter };

