import { getPool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const checkUsers = async () => {
  const pool = getPool();
  
  const [users] = await pool.query(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
  ) as any[];

  if (users.length === 0) {
    console.log('❌ No users found in database.');
    console.log('\nTo create an admin user, run:');
    console.log('  npm run seed');
    console.log('\nOr create a custom user:');
    console.log('  npm run create-user email@example.com password Name admin');
    return;
  }

  console.log(`✅ Found ${users.length} user(s):\n`);
  users.forEach((user: any, index: number) => {
    console.log(`${index + 1}. ${user.email}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');
  });
};

checkUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to check users:', error);
    process.exit(1);
  });

