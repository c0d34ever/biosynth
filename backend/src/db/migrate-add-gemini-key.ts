import { getPool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration: Add gemini_api_key column to users table
 * Run this script to add the column to existing databases
 */
const migrateAddGeminiKey = async () => {
  const pool = getPool();
  
  try {
    console.log('🔄 Checking if gemini_api_key column exists...');
    
    // Check if column exists
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'gemini_api_key'
    `) as any[];
    
    if (columns.length > 0) {
      console.log('✅ Column gemini_api_key already exists in users table');
      return;
    }
    
    console.log('➕ Adding gemini_api_key column to users table...');
    
    // Add the column
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN gemini_api_key VARCHAR(500) NULL
    `);
    
    console.log('✅ Successfully added gemini_api_key column to users table');
    
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Column gemini_api_key already exists');
    } else {
      console.error('❌ Error adding column:', error.message);
      throw error;
    }
  }
};

/**
 * Migration: Create global_settings table if it doesn't exist
 */
const migrateGlobalSettings = async () => {
  const pool = getPool();
  
  try {
    console.log('🔄 Checking if global_settings table exists...');
    
    // Check if table exists
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'global_settings'
    `) as any[];
    
    if (tables.length > 0) {
      console.log('✅ global_settings table already exists');
      
      // Check if default API key exists
      const [settings] = await pool.query(`
        SELECT * FROM global_settings WHERE setting_key = 'gemini_api_key'
      `) as any[];
      
      if (settings.length === 0) {
        console.log('➕ Adding default gemini_api_key to global_settings...');
        const defaultKey = process.env.GEMINI_API_KEY || 'AIzaSyBq34MoOQ3NBHhJ1TQZD-vxeLSJM86Dog4';
        await pool.query(`
          INSERT INTO global_settings (setting_key, setting_value, description)
          VALUES ('gemini_api_key', ?, 'Default Gemini API key for all users')
        `, [defaultKey]);
        console.log('✅ Default API key added to global_settings');
      }
      
      return;
    }
    
    console.log('➕ Creating global_settings table...');
    
    // Create the table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_setting_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Add default API key
    const defaultKey = process.env.GEMINI_API_KEY || 'AIzaSyBq34MoOQ3NBHhJ1TQZD-vxeLSJM86Dog4';
    await pool.query(`
      INSERT INTO global_settings (setting_key, setting_value, description)
      VALUES ('gemini_api_key', ?, 'Default Gemini API key for all users')
    `, [defaultKey]);
    
    console.log('✅ Successfully created global_settings table with default API key');
    
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('✅ Default API key already exists in global_settings');
    } else {
      console.error('❌ Error creating global_settings table:', error.message);
      throw error;
    }
  }
};

const runMigrations = async () => {
  try {
    console.log('🚀 Running database migrations...\n');
    
    await migrateAddGeminiKey();
    console.log('');
    await migrateGlobalSettings();
    
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();

