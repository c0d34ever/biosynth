import { Router, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { addJob } from '../services/queue.js';

const router = Router();

const jobSchema = z.object({
  jobType: z.enum(['generate', 'synthesize', 'analyze', 'improve']),
  inputData: z.record(z.any())
});

// Create job
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = jobSchema.parse(req.body);
    const pool = getPool();

    // Create job record
    const [result] = await pool.query(
      `INSERT INTO jobs (user_id, job_type, status, input_data)
      VALUES (?, ?, 'pending', ?)`,
      [req.userId, data.jobType, JSON.stringify(data.inputData)]
    ) as any[];

    const jobId = result.insertId;

    // Add to queue (this may process synchronously if Redis is disabled)
    try {
      await addJob({
        jobId,
        userId: req.userId!,
        jobType: data.jobType,
        inputData: data.inputData
      });
    } catch (error: any) {
      // If job processing fails immediately (synchronous mode), 
      // the job status is already updated in the database
      // We still return success because the job was created
      console.error('Error processing job (job may have been marked as failed):', error.message);
    }

    res.status(201).json({
      id: jobId,
      status: 'pending',
      jobType: data.jobType
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    // For other errors, return 500
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Get user's jobs
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [jobs] = await pool.query(
      `SELECT 
        id, job_type as jobType, status, input_data as inputData,
        result_data as resultData, error_message as errorMessage,
        created_at as createdAt, updated_at as updatedAt, completed_at as completedAt
      FROM jobs 
      WHERE user_id = ? 
      ORDER BY created_at DESC
      LIMIT 50`,
      [req.userId]
    ) as any[];

    res.json(jobs.map((job: any) => {
      // Safe JSON parsing - handle cases where data might already be an object or invalid JSON
      let inputData = job.inputData;
      if (typeof inputData === 'string') {
        try {
          inputData = JSON.parse(inputData);
        } catch {
          // If parsing fails, return as-is or empty object
          inputData = {};
        }
      }
      
      let resultData = job.resultData;
      if (resultData && typeof resultData === 'string') {
        try {
          resultData = JSON.parse(resultData);
        } catch {
          // If parsing fails, return null
          resultData = null;
        }
      }
      
      return {
        ...job,
        inputData,
        resultData
      };
    }));
  } catch (error) {
    throw error;
  }
});

// Get single job
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [jobs] = await pool.query(
      `SELECT 
        id, job_type as jobType, status, input_data as inputData,
        result_data as resultData, error_message as errorMessage,
        created_at as createdAt, updated_at as updatedAt, completed_at as completedAt
      FROM jobs 
      WHERE id = ? AND user_id = ?`,
      [req.params.id, req.userId]
    ) as any[];

    if (jobs.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const job = jobs[0];
    
    // Safe JSON parsing - handle cases where data might already be an object or invalid JSON
    let inputData = job.inputData;
    if (typeof inputData === 'string') {
      try {
        inputData = JSON.parse(inputData);
      } catch {
        // If parsing fails, return as-is or empty object
        inputData = {};
      }
    }
    
    let resultData = job.resultData;
    if (resultData && typeof resultData === 'string') {
      try {
        resultData = JSON.parse(resultData);
      } catch {
        // If parsing fails, return null
        resultData = null;
      }
    }
    
    res.json({
      ...job,
      inputData,
      resultData
    });
  } catch (error) {
    throw error;
  }
});

export { router as jobRouter };

