// Optional worker starter - can be imported in index.ts if needed
// For production, use the separate queue-worker service
import { startWorker } from './services/queue.js';

export const startBackendWorker = () => {
  console.log('🚀 Starting backend worker...');
  startWorker();
};

