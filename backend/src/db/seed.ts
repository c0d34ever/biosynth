import bcrypt from 'bcryptjs';
import { getPool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdminUser = async () => {
  const pool = getPool();
  
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@biosynth.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  // Check if admin exists
  const [existing] = await pool.query(
    'SELECT id FROM users WHERE email = ?',
    [adminEmail]
  ) as any[];

  if (existing.length > 0) {
    console.log('Admin user already exists');
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await pool.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    [adminEmail, passwordHash, 'Admin', 'admin']
  );

  console.log(`✅ Admin user created:`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   ⚠️  Please change the password after first login!`);
};

const seed = async () => {
  try {
    await createAdminUser();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();

