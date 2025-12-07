import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { createTables } from './schema.js';

dotenv.config();

let pool: mysql.Pool | null = null;

export const getPool = (): mysql.Pool => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'biosynth',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  }
  return pool;
};

export const initDatabase = async (): Promise<void> => {
  try {
    const pool = getPool();
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established');
    
    // Create tables
    await createTables(pool);
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

