import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { getPool } from '../db/connection.js';
import { processGenerateJob, processSynthesizeJob, processAnalyzeJob, processImproveJob } from './aiProcessor.js';

// Check if Redis is enabled
let REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';
let connection: IORedis | null = null;
let jobQueue: Queue | null = null;

if (REDIS_ENABLED) {
  try {
    connection = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('⚠️  Redis connection failed after 3 retries. Jobs will be processed synchronously.');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true
    });

    connection.on('error', (err) => {
      console.warn('⚠️  Redis connection error:', err.message);
      console.warn('⚠️  Jobs will be processed synchronously without queue.');
    });

    connection.on('connect', () => {
      console.log('✅ Redis connected');
    });

    jobQueue = new Queue('ai-jobs', { connection });
  } catch (error) {
    console.warn('⚠️  Failed to initialize Redis. Jobs will be processed synchronously.');
    REDIS_ENABLED = false;
  }
} else {
  console.log('ℹ️  Redis is disabled. Jobs will be processed synchronously.');
}

export interface JobData {
  jobId: number;
  userId: number;
  jobType: 'generate' | 'synthesize' | 'analyze' | 'improve';
  inputData: any;
}

export const addJob = async (data: JobData): Promise<void> => {
  if (REDIS_ENABLED && jobQueue) {
    try {
      await jobQueue.add(data.jobType, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      });
      return;
    } catch (error: any) {
      console.warn('⚠️  Failed to add job to queue, processing synchronously:', error.message);
      // Fall through to synchronous processing
    }
  }

  // Synchronous processing when Redis is disabled or unavailable
  await processJobSynchronously(data);
};

// Synchronous job processing (fallback when Redis is disabled)
const processJobSynchronously = async (data: JobData): Promise<void> => {
  const pool = getPool();

  try {
    // Update job status to processing
    await pool.query(
      'UPDATE jobs SET status = ? WHERE id = ?',
      ['processing', data.jobId]
    );

    let result: any;

    // Process based on job type
    switch (data.jobType) {
      case 'generate':
        result = await processGenerateJob(data.inputData, data.userId);
        break;
      case 'synthesize':
        result = await processSynthesizeJob(data.inputData, data.userId);
        break;
      case 'analyze':
        result = await processAnalyzeJob(data.inputData, data.userId);
        break;
      case 'improve':
        result = await processImproveJob(data.inputData, data.userId);
        break;
      default:
        throw new Error(`Unknown job type: ${data.jobType}`);
    }

    // Update job with result
    await pool.query(
      `UPDATE jobs 
      SET status = ?, result_data = ?, completed_at = NOW() 
      WHERE id = ?`,
      ['completed', JSON.stringify(result), data.jobId]
    );

    console.log(`✅ Job ${data.jobId} (${data.jobType}) completed synchronously`);
  } catch (error: any) {
    // Use the error message (which should already be user-friendly from aiProcessor)
    // If it's not set or is still a JSON string, provide a fallback
    let errorMessage = error.message || 'An unknown error occurred';
    
    // Transform JSON.parse errors that mention "Initializa" or "Unexpected token"
    if (errorMessage.includes('Unexpected token') && errorMessage.includes('Initializa')) {
      errorMessage = 'AI service returned a response that cannot be parsed as JSON. The response appears to contain error or status messages (like "Initialization..."). Please try again.';
    } else if (errorMessage.includes('Unexpected token') && errorMessage.includes('is not valid JSON')) {
      errorMessage = 'AI service returned an invalid JSON response. Please try again.';
    }
    
    // If the message is still JSON (shouldn't happen with our fixes, but safety check)
    if (errorMessage.startsWith('{') || errorMessage.startsWith('[')) {
      try {
        const parsed = JSON.parse(errorMessage);
        errorMessage = parsed.error?.message || parsed.message || 'An error occurred while processing the request';
      } catch {
        errorMessage = 'An error occurred while processing the request';
      }
    }
    
    // Update job with error
    await pool.query(
      `UPDATE jobs 
      SET status = ?, error_message = ?, completed_at = NOW() 
      WHERE id = ?`,
      ['failed', errorMessage, data.jobId]
    );
    console.error(`❌ Job ${data.jobId} (${data.jobType}) failed:`, errorMessage);
    
    // Don't re-throw - we've already handled the error by updating the job status
    // The frontend can poll for the job status to get the error message
  }
};

// Worker to process jobs (only if Redis is enabled)
export const startWorker = (): void => {
  if (!REDIS_ENABLED || !connection || !jobQueue) {
    console.log('ℹ️  Queue worker not started (Redis disabled or unavailable)');
    return;
  }

  try {
    const worker = new Worker(
      'ai-jobs',
      async (job) => {
        const { jobId, userId, jobType, inputData } = job.data as JobData;
        const pool = getPool();

        try {
          // Update job status to processing
          await pool.query(
            'UPDATE jobs SET status = ? WHERE id = ?',
            ['processing', jobId]
          );

          let result: any;

          // Process based on job type
          switch (jobType) {
            case 'generate':
              result = await processGenerateJob(inputData, userId);
              break;
            case 'synthesize':
              result = await processSynthesizeJob(inputData, userId);
              break;
            case 'analyze':
              result = await processAnalyzeJob(inputData, userId);
              break;
            case 'improve':
              result = await processImproveJob(inputData, userId);
              break;
            default:
              throw new Error(`Unknown job type: ${jobType}`);
          }

          // Update job with result
          await pool.query(
            `UPDATE jobs 
            SET status = ?, result_data = ?, completed_at = NOW() 
            WHERE id = ?`,
            ['completed', JSON.stringify(result), jobId]
          );

          return result;
        } catch (error: any) {
          // Use the error message (which should already be user-friendly from aiProcessor)
          // If it's not set or is still a JSON string, provide a fallback
          let errorMessage = error.message || 'An unknown error occurred';
          
          // Transform JSON.parse errors that mention "Initializa" or "Unexpected token"
          if (errorMessage.includes('Unexpected token') && errorMessage.includes('Initializa')) {
            errorMessage = 'AI service returned a response that cannot be parsed as JSON. The response appears to contain error or status messages (like "Initialization..."). Please try again.';
          } else if (errorMessage.includes('Unexpected token') && errorMessage.includes('is not valid JSON')) {
            errorMessage = 'AI service returned an invalid JSON response. Please try again.';
          }
          
          // If the message is still JSON (shouldn't happen with our fixes, but safety check)
          if (errorMessage.startsWith('{') || errorMessage.startsWith('[')) {
            try {
              const parsed = JSON.parse(errorMessage);
              errorMessage = parsed.error?.message || parsed.message || 'An error occurred while processing the request';
            } catch {
              errorMessage = 'An error occurred while processing the request';
            }
          }
          
          // Update job with error
          await pool.query(
            `UPDATE jobs 
            SET status = ?, error_message = ?, completed_at = NOW() 
            WHERE id = ?`,
            ['failed', errorMessage, jobId]
          );
          
          console.error(`❌ Job ${jobId} (${jobType}) failed:`, errorMessage);
          
          // Re-throw a clean error for BullMQ to mark the job as failed
          // This is safe because BullMQ's worker will catch it
          const cleanError = new Error(errorMessage);
          if (error.status) {
            (cleanError as any).status = error.status;
          }
          throw cleanError;
        }
      },
      { connection, concurrency: 5 }
    );

    worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err);
    });

    console.log('✅ Queue worker started');
  } catch (error: any) {
    console.warn('⚠️  Failed to start queue worker:', error.message);
    console.warn('⚠️  Jobs will be processed synchronously');
  }
};

