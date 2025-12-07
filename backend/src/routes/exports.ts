import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

const exportSchema = z.object({
  algorithmIds: z.array(z.number()).optional(),
  collectionId: z.number().optional(),
  exportType: z.enum(['json', 'markdown'])
});

// Get export history
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [exports] = await pool.query(
      `SELECT e.*, a.name as algorithm_name
      FROM exports e
      LEFT JOIN algorithms a ON e.algorithm_id = a.id
      WHERE e.user_id = ?
      ORDER BY e.created_at DESC
      LIMIT 50`,
      [req.userId]
    ) as any[];

    res.json(exports);
  } catch (error) {
    throw error;
  }
});

// Create export
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = exportSchema.parse(req.body);
    const pool = getPool();

    let algorithms: any[] = [];

    if (data.collectionId) {
      // Export collection
      const [collectionAlgos] = await pool.query(
        `SELECT a.*
        FROM algorithms a
        JOIN collection_algorithms ca ON a.id = ca.algorithm_id
        WHERE ca.collection_id = ? AND a.user_id = ?`,
        [data.collectionId, req.userId]
      ) as any[];

      algorithms = collectionAlgos;
    } else if (data.algorithmIds && data.algorithmIds.length > 0) {
      // Export specific algorithms
      const placeholders = data.algorithmIds.map(() => '?').join(',');
      const [selectedAlgos] = await pool.query(
        `SELECT * FROM algorithms WHERE id IN (${placeholders}) AND user_id = ?`,
        [...data.algorithmIds, req.userId]
      ) as any[];

      algorithms = selectedAlgos;
    } else {
      res.status(400).json({ error: 'algorithmIds or collectionId required' });
      return;
    }

    if (algorithms.length === 0) {
      res.status(404).json({ error: 'No algorithms found to export' });
      return;
    }

    // Generate export content
    let exportContent: string;
    let fileName: string;

    if (data.exportType === 'json') {
      exportContent = JSON.stringify(
        algorithms.map((algo: any) => ({
          ...algo,
          steps: JSON.parse(algo.steps),
          applications: JSON.parse(algo.applications),
          tags: JSON.parse(algo.tags),
          parentIds: algo.parentIds ? JSON.parse(algo.parentIds) : null
        })),
        null,
        2
      );
      fileName = `algorithms_${Date.now()}.json`;
    } else {
      // Markdown export
      exportContent = algorithms.map((algo: any) => {
        const steps = JSON.parse(algo.steps);
        const applications = JSON.parse(algo.applications);
        const tags = JSON.parse(algo.tags);

        return `# ${algo.name}

**Inspiration:** ${algo.inspiration}  
**Domain:** ${algo.domain}  
**Type:** ${algo.type}

## Description
${algo.description}

## Core Principle
${algo.principle}

## Steps
${steps.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n')}

## Applications
${applications.map((app: string) => `- ${app}`).join('\n')}

## Tags
${tags.map((tag: string) => `\`${tag}\``).join(', ')}

## Pseudocode
\`\`\`
${algo.pseudo_code}
\`\`\`

---
`;
      }).join('\n\n');
      fileName = `algorithms_${Date.now()}.md`;
    }

    // Save export record
    const [result] = await pool.query(
      `INSERT INTO exports (user_id, algorithm_id, export_type, file_name, file_size)
      VALUES (?, ?, ?, ?, ?)`,
      [
        req.userId,
        data.algorithmIds && data.algorithmIds.length === 1 ? data.algorithmIds[0] : null,
        data.exportType,
        fileName,
        Buffer.byteLength(exportContent, 'utf8')
      ]
    ) as any[];

    // Return export content (in production, you'd save to file storage)
    res.json({
      id: result.insertId,
      fileName,
      content: exportContent,
      size: Buffer.byteLength(exportContent, 'utf8'),
      type: data.exportType
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

export { router as exportRouter };

