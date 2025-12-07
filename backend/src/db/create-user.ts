import bcrypt from 'bcryptjs';
import { getPool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const createUser = async () => {
  const pool = getPool();
  
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@biosynth.com';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.argv[4] || 'Admin';
  const role = process.argv[5] || 'admin';
  
  // Check if user exists
  const [existing] = await pool.query(
    'SELECT id, email FROM users WHERE email = ?',
    [email]
  ) as any[];

  if (existing.length > 0) {
    console.log(`⚠️  User already exists: ${email}`);
    console.log('   To reset password, delete the user first or use a different email.');
    return;
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    [email, passwordHash, name, role]
  );

  console.log(`✅ User created successfully!`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role: ${role}`);
  console.log(`\n   You can now login with these credentials.`);
};

createUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to create user:', error);
    process.exit(1);
  });

