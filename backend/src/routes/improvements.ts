import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const improvementSchema = z.object({
  improvementType: z.enum(['optimization', 'bug_fix', 'feature_add', 'refactor', 'performance']),
  title: z.string().min(1),
  description: z.string().min(1),
  currentState: z.string().optional(),
  proposedChange: z.string().min(1),
  expectedBenefit: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional()
});

// Get improvements for algorithm
router.get('/algorithm/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { status, improvementType } = req.query;

    let query = `
      SELECT i.*, u.name as suggested_by_name
      FROM algorithm_improvements i
      JOIN users u ON i.user_id = u.id
      WHERE i.algorithm_id = ?
    `;

    const params: any[] = [req.params.algorithmId];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (improvementType) {
      query += ' AND i.improvement_type = ?';
      params.push(improvementType);
    }

    query += ` ORDER BY 
      CASE i.priority
        WHEN "high" THEN 1
        WHEN "medium" THEN 2
        WHEN "low" THEN 3
      END,
      i.created_at DESC`;

    const [improvements] = await pool.query(query, params) as any[];

    res.json(improvements);
  } catch (error) {
    throw error;
  }
});

// Create improvement suggestion
router.post('/algorithm/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = improvementSchema.parse(req.body);
    const pool = getPool();

    // Verify algorithm access
    const [algorithms] = await pool.query(
      'SELECT id FROM algorithms WHERE id = ? AND (user_id = ? OR visibility = "public")',
      [req.params.algorithmId, req.userId]
    ) as any[];

    if (algorithms.length === 0) {
      res.status(404).json({ error: 'Algorithm not found' });
      return;
    }

    const [result] = await pool.query(
      `INSERT INTO algorithm_improvements 
      (algorithm_id, user_id, improvement_type, title, description, current_state, 
       proposed_change, expected_benefit, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.algorithmId,
        req.userId,
        data.improvementType,
        data.title,
        data.description,
        data.currentState || null,
        data.proposedChange,
        data.expectedBenefit || null,
        data.priority || 'medium'
      ]
    ) as any[];

    // Create notification for algorithm owner
    const [algoOwners] = await pool.query(
      'SELECT user_id FROM algorithms WHERE id = ?',
      [req.params.algorithmId]
    ) as any[];

    if (algoOwners.length > 0 && algoOwners[0].user_id !== req.userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, related_algorithm_id, related_user_id)
        VALUES (?, 'system', 'Improvement Suggested', ?, ?, ?)`,
        [
          algoOwners[0].user_id,
          'Someone suggested an improvement for your algorithm',
          req.params.algorithmId,
          req.userId
        ]
      );
    }

    const [improvements] = await pool.query(
      'SELECT * FROM algorithm_improvements WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json(improvements[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Update improvement status
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, implementationNotes } = req.body;
    if (!status) {
      res.status(400).json({ error: 'status required' });
      return;
    }

    const pool = getPool();

    // Verify improvement exists and user has access
    const [improvements] = await pool.query(
      `SELECT i.*, a.user_id as algorithm_owner_id
      FROM algorithm_improvements i
      JOIN algorithms a ON i.algorithm_id = a.id
      WHERE i.id = ? AND (i.user_id = ? OR a.user_id = ?)`,
      [req.params.id, req.userId, req.userId]
    ) as any[];

    if (improvements.length === 0) {
      res.status(404).json({ error: 'Improvement not found' });
      return;
    }

    const updates: string[] = ['status = ?'];
    const values: any[] = [status];

    if (implementationNotes) {
      updates.push('implementation_notes = ?');
      values.push(implementationNotes);
    }

    if (status === 'completed') {
      updates.push('completed_at = NOW()');
    }

    values.push(req.params.id);

    await pool.query(
      `UPDATE algorithm_improvements SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [updated] = await pool.query(
      'SELECT * FROM algorithm_improvements WHERE id = ?',
      [req.params.id]
    ) as any[];

    res.json(updated[0]);
  } catch (error) {
    throw error;
  }
});

// Get user's improvement suggestions
router.get('/my-suggestions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [improvements] = await pool.query(
      `SELECT i.*, a.name as algorithm_name
      FROM algorithm_improvements i
      JOIN algorithms a ON i.algorithm_id = a.id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC`,
      [req.userId]
    ) as any[];

    res.json(improvements);
  } catch (error) {
    throw error;
  }
});

export { router as improvementRouter };

