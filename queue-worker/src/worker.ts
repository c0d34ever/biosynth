import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import mysql from 'mysql2/promise';
import { processGenerateJob, processSynthesizeJob, processAnalyzeJob, processImproveJob } from './aiProcessor.js';

// Check if Redis is enabled
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

let connection: IORedis | null = null;
let redisAvailable = false;

if (REDIS_ENABLED) {
  try {
    connection = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('⚠️  Redis connection failed after 3 retries. Worker will wait and retry.');
          console.warn('⚠️  Set REDIS_ENABLED=false to disable Redis and use synchronous processing.');
          return null; // Stop retrying, but don't exit
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false // Don't queue commands when offline
    });

    connection.on('error', (err) => {
      if (redisAvailable) {
        console.warn('⚠️  Redis connection error:', err.message);
        console.warn('⚠️  Worker will continue waiting for Redis to reconnect.');
      }
      redisAvailable = false;
      // Don't exit - allow Redis to reconnect
    });

    connection.on('connect', () => {
      if (!redisAvailable) {
        console.log('✅ Redis connected');
        redisAvailable = true;
      }
    });

    connection.on('ready', () => {
      redisAvailable = true;
      console.log('✅ Redis ready');
    });

    connection.on('close', () => {
      redisAvailable = false;
      console.warn('⚠️  Redis connection closed. Worker will wait for reconnection.');
    });

    // Try to connect
    connection.connect().catch((err) => {
      console.warn('⚠️  Initial Redis connection failed:', err.message);
      console.warn('⚠️  Worker will wait for Redis to become available.');
      console.warn('⚠️  Set REDIS_ENABLED=false in .env to disable Redis.');
      redisAvailable = false;
    });
  } catch (error: any) {
    console.warn('⚠️  Failed to initialize Redis:', error.message);
    console.warn('⚠️  Set REDIS_ENABLED=false in .env to disable Redis.');
    connection = null;
    redisAvailable = false;
  }
} else {
  console.log('ℹ️  Redis is disabled. Queue worker not needed.');
  console.log('ℹ️  Backend will process jobs synchronously.');
  process.exit(0);
}

let pool: mysql.Pool | null = null;

const getPool = (): mysql.Pool => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'biosynth',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
};

export const startWorker = (): void => {
  if (!REDIS_ENABLED) {
    console.log('ℹ️  Queue worker not started (Redis disabled)');
    return;
  }

  if (!connection) {
    console.warn('⚠️  Queue worker not started (Redis connection unavailable)');
    console.warn('⚠️  Set REDIS_ENABLED=false to disable Redis and use synchronous processing.');
    return;
  }

  // Wait a bit for Redis to connect before starting worker
  const checkRedisAndStart = async () => {
    if (!redisAvailable) {
      try {
        await connection!.ping();
        redisAvailable = true;
        console.log('✅ Redis is available, starting worker...');
      } catch (err) {
        console.warn('⚠️  Redis not available yet, waiting 5 seconds...');
        console.warn('⚠️  Set REDIS_ENABLED=false to disable Redis.');
        setTimeout(checkRedisAndStart, 5000);
        return;
      }
    }

    const worker = new Worker(
      'ai-jobs',
      async (job) => {
        const { jobId, userId, jobType, inputData } = job.data as any;
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
              result = await processAnalyzeJob(inputData, pool, userId);
              break;
            case 'improve':
              result = await processImproveJob(inputData, pool, userId);
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

          console.log(`✅ Job ${jobId} (${jobType}) completed successfully`);
          return result;
        } catch (error: any) {
          // Update job with error
          await pool.query(
            `UPDATE jobs 
            SET status = ?, error_message = ?, completed_at = NOW() 
            WHERE id = ?`,
            ['failed', error.message, jobId]
          );
          console.error(`❌ Job ${jobId} (${jobType}) failed:`, error.message);
          throw error;
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

    worker.on('error', (err) => {
      console.error('Worker error:', err);
      // Don't exit on worker errors - let it try to recover
    });

    console.log('✅ Queue worker started and listening for jobs');
  };

  // Start checking Redis availability
  checkRedisAndStart();
};

