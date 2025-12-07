import { Router, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const router = Router();

// Export algorithms to JSON
router.post('/export/algorithms', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.userId;
    const { algorithmIds, format = 'json' } = req.body;

    let query = `
      SELECT 
        id,
        name,
        inspiration,
        domain,
        description,
        principle,
        steps,
        applications,
        pseudo_code,
        tags,
        type,
        parent_ids,
        created_at,
        updated_at
      FROM algorithms
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (algorithmIds && Array.isArray(algorithmIds) && algorithmIds.length > 0) {
      query += ' AND id IN (?)';
      params.push(algorithmIds);
    }

    const [algorithms] = await pool.query(query, params) as any[];

    // Get analysis data for each algorithm
    for (const algo of algorithms) {
      const [analysis] = await pool.query(
        'SELECT analysis_type, result, created_at FROM algorithm_analysis WHERE algorithm_id = ? ORDER BY created_at DESC',
        [algo.id]
      ) as any[];

      algo.analysis = analysis.reduce((acc: any, a: any) => {
        acc[a.analysis_type] = {
          ...a.result,
          lastRun: new Date(a.created_at).getTime()
        };
        return acc;
      }, {});
    }

    // Create exports directory if it doesn't exist
    const exportsDir = join(process.cwd(), 'exports');
    if (!existsSync(exportsDir)) {
      await mkdir(exportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `algorithms_export_${timestamp}.json`;
    const filepath = join(exportsDir, filename);

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      algorithms: algorithms.map(algo => ({
        ...algo,
        steps: typeof algo.steps === 'string' ? JSON.parse(algo.steps) : algo.steps,
        applications: typeof algo.applications === 'string' ? JSON.parse(algo.applications) : algo.applications,
        tags: typeof algo.tags === 'string' ? JSON.parse(algo.tags) : algo.tags,
        parent_ids: typeof algo.parent_ids === 'string' ? JSON.parse(algo.parent_ids || '[]') : (algo.parent_ids || [])
      }))
    };

    await writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf-8');

    // Record export in database
    await pool.query(
      `INSERT INTO exports (user_id, export_type, file_name, file_path, file_size, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, 'json', filename, filepath, JSON.stringify(exportData).length]
    );

    res.json({
      success: true,
      filename,
      filepath,
      algorithmCount: algorithms.length,
      downloadUrl: `/api/export-import/download/${filename}`
    });
  } catch (error: any) {
    console.error('[Export] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to export algorithms' });
  }
});

// Import algorithms from JSON
router.post('/import/algorithms', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.userId;
    const { algorithms, overwrite = false } = req.body;

    if (!Array.isArray(algorithms) || algorithms.length === 0) {
      return res.status(400).json({ error: 'Invalid algorithms data' });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const algoData of algorithms) {
      try {
        // Check if algorithm with same name exists
        const [existing] = await pool.query(
          'SELECT id FROM algorithms WHERE user_id = ? AND name = ?',
          [userId, algoData.name]
        ) as any[];

        if (existing.length > 0 && !overwrite) {
          results.skipped++;
          continue;
        }

        const algorithmData = {
          user_id: userId,
          name: algoData.name,
          inspiration: algoData.inspiration,
          domain: algoData.domain,
          description: algoData.description,
          principle: algoData.principle,
          steps: JSON.stringify(Array.isArray(algoData.steps) ? algoData.steps : []),
          applications: JSON.stringify(Array.isArray(algoData.applications) ? algoData.applications : []),
          pseudo_code: algoData.pseudo_code || algoData.pseudoCode || '',
          tags: JSON.stringify(Array.isArray(algoData.tags) ? algoData.tags : []),
          type: algoData.type || 'generated',
          parent_ids: algoData.parent_ids ? JSON.stringify(algoData.parent_ids) : null
        };

        if (existing.length > 0 && overwrite) {
          await pool.query(
            `UPDATE algorithms 
             SET inspiration = ?, domain = ?, description = ?, principle = ?, 
                 steps = ?, applications = ?, pseudo_code = ?, tags = ?, 
                 type = ?, parent_ids = ?, updated_at = NOW()
             WHERE id = ?`,
            [
              algorithmData.inspiration,
              algorithmData.domain,
              algorithmData.description,
              algorithmData.principle,
              algorithmData.steps,
              algorithmData.applications,
              algorithmData.pseudo_code,
              algorithmData.tags,
              algorithmData.type,
              algorithmData.parent_ids,
              existing[0].id
            ]
          );
        } else {
          await pool.query(
            `INSERT INTO algorithms 
             (user_id, name, inspiration, domain, description, principle, steps, 
              applications, pseudo_code, tags, type, parent_ids, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              algorithmData.user_id,
              algorithmData.name,
              algorithmData.inspiration,
              algorithmData.domain,
              algorithmData.description,
              algorithmData.principle,
              algorithmData.steps,
              algorithmData.applications,
              algorithmData.pseudo_code,
              algorithmData.tags,
              algorithmData.type,
              algorithmData.parent_ids
            ]
          );
        }

        results.imported++;
      } catch (error: any) {
        results.errors.push(`Failed to import ${algoData.name}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      ...results
    });
  } catch (error: any) {
    console.error('[Import] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to import algorithms' });
  }
});

// Get export history
router.get('/exports', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.userId;
    const { limit = 20, offset = 0 } = req.query;

    const [exports] = await pool.query(
      `SELECT 
        id,
        algorithm_id,
        export_type,
        file_name,
        file_size,
        created_at
      FROM exports
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, Number(limit), Number(offset)]
    ) as any[];

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM exports WHERE user_id = ?',
      [userId]
    ) as any[];

    res.json({
      exports,
      total: countResult[0]?.total || 0,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error: any) {
    console.error('[Export History] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch export history' });
  }
});

// Download export file
router.get('/download/:filename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.userId;
    const filename = req.params.filename;

    // Verify user owns this export
    const [exports] = await pool.query(
      'SELECT file_path FROM exports WHERE user_id = ? AND file_name = ?',
      [userId, filename]
    ) as any[];

    if (exports.length === 0) {
      return res.status(404).json({ error: 'Export not found' });
    }

    const filepath = exports[0].file_path;
    
    if (!existsSync(filepath)) {
      return res.status(404).json({ error: 'Export file not found on server' });
    }

    const fileContent = await readFile(filepath, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(fileContent);
  } catch (error: any) {
    console.error('[Download] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to download export' });
  }
});

export default router;

