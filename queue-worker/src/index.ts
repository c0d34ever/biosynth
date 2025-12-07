import dotenv from 'dotenv';
import { startWorker } from './worker.js';

dotenv.config();

console.log('🚀 Starting queue worker...');
startWorker();
// Note: Worker may take a moment to connect to Redis if it's not immediately available

