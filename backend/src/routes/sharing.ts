import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

const shareSchema = z.object({
  algorithmId: z.number(),
  sharedWithUserId: z.number().optional(),
  permission: z.enum(['view', 'edit', 'comment']).optional(),
  isPublic: z.boolean().optional(),
  expiresAt: z.string().optional()
});

// Share algorithm
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = shareSchema.parse(req.body);
    const pool = getPool();

    // Verify algorithm ownership
    const [algorithms] = await pool.query(
      'SELECT id FROM algorithms WHERE id = ? AND user_id = ?',
      [data.algorithmId, req.userId]
    ) as any[];

    if (algorithms.length === 0) {
      res.status(404).json({ error: 'Algorithm not found' });
      return;
    }

    // Generate share token if public
    const shareToken = data.isPublic ? crypto.randomBytes(32).toString('hex') : null;

    const [result] = await pool.query(
      `INSERT INTO shares 
      (algorithm_id, shared_by_user_id, shared_with_user_id, share_token, permission, is_public, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.algorithmId,
        req.userId,
        data.sharedWithUserId || null,
        shareToken,
        data.permission || 'view',
        data.isPublic || false,
        data.expiresAt ? new Date(data.expiresAt) : null
      ]
    ) as any[];

    // Create notification if sharing with specific user
    if (data.sharedWithUserId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, related_algorithm_id, related_user_id)
        VALUES (?, 'share', 'Algorithm Shared', ?, ?, ?)`,
        [
          data.sharedWithUserId,
          'Someone shared an algorithm with you',
          data.algorithmId,
          req.userId
        ]
      );
    }

    const [shares] = await pool.query(
      'SELECT * FROM shares WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json(shares[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Get shared algorithms (algorithms shared with me)
router.get('/received', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [algorithms] = await pool.query(
      `SELECT a.*, s.permission, s.created_at as shared_at, u.name as shared_by_name
      FROM algorithms a
      JOIN shares s ON a.id = s.algorithm_id
      JOIN users u ON s.shared_by_user_id = u.id
      WHERE s.shared_with_user_id = ? 
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
      ORDER BY s.created_at DESC`,
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

// Get algorithms I shared
router.get('/sent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [shares] = await pool.query(
      `SELECT s.*, a.name as algorithm_name, u.name as shared_with_name
      FROM shares s
      JOIN algorithms a ON s.algorithm_id = a.id
      LEFT JOIN users u ON s.shared_with_user_id = u.id
      WHERE s.shared_by_user_id = ?
      ORDER BY s.created_at DESC`,
      [req.userId]
    ) as any[];

    res.json(shares);
  } catch (error) {
    throw error;
  }
});

// Access shared algorithm by token
router.get('/token/:token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [shares] = await pool.query(
      `SELECT s.*, a.*
      FROM shares s
      JOIN algorithms a ON s.algorithm_id = a.id
      WHERE s.share_token = ? 
      AND s.is_public = TRUE
      AND (s.expires_at IS NULL OR s.expires_at > NOW())`,
      [req.params.token]
    ) as any[];

    if (shares.length === 0) {
      res.status(404).json({ error: 'Shared link not found or expired' });
      return;
    }

    const algo = shares[0];
    res.json({
      ...algo,
      steps: JSON.parse(algo.steps),
      applications: JSON.parse(algo.applications),
      tags: JSON.parse(algo.tags),
      parentIds: algo.parentIds ? JSON.parse(algo.parentIds) : null
    });
  } catch (error) {
    throw error;
  }
});

// Revoke share
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM shares WHERE id = ? AND shared_by_user_id = ?',
      [req.params.id, req.userId]
    ) as any[];

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Share not found' });
      return;
    }

    res.json({ message: 'Share revoked' });
  } catch (error) {
    throw error;
  }
});

export { router as sharingRouter };

