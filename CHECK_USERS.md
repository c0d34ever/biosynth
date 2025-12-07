# How to Check and Create Users in BioSynth Database

## Database Information

- **Type**: MySQL 8.0
- **Container**: `biosynth-mysql`
- **Database Name**: `biosynth` (default, or from `DB_NAME` env var)
- **Root User**: `root`
- **Root Password**: `biosynth_password` (default, or from `DB_PASSWORD` env var)
- **Port**: `3306`

## Method 1: Using Docker Commands (Recommended)

### Check Existing Users
```bash
# Check users via backend container
docker exec biosynth-backend npm run check-users
```

### Create Admin User
```bash
# Create default admin user (admin@biosynth.com / admin123)
docker exec biosynth-backend npm run seed

# Or create custom user
docker exec biosynth-backend npm run create-user your-email@example.com your-password YourName admin
```

## Method 2: Direct MySQL Access

### Connect to MySQL Container
```bash
# Connect to MySQL
docker exec -it biosynth-mysql mysql -uroot -p

# Enter password when prompted (default: biosynth_password)
```

### SQL Commands

#### Check all users:
```sql
USE biosynth;
SELECT id, email, name, role, created_at FROM users;
```

#### Create a new user:
```sql
USE biosynth;
INSERT INTO users (email, password_hash, name, role) 
VALUES (
  'your-email@example.com',
  '$2a$10$YourHashedPasswordHere',  -- Use bcrypt hash
  'Your Name',
  'admin'  -- or 'user'
);
```

#### Create user with password (using bcrypt):
```sql
-- First, you need to hash the password using bcrypt
-- Use the create-user script instead, or use this Python/Node script
```

## Method 3: Using Backend Scripts (if backend is running locally)

```bash
cd backend
npm run check-users
npm run seed
npm run create-user email@example.com password Name admin
```

## Default Admin Credentials (if seed was run)

- **Email**: `admin@biosynth.com`
- **Password**: `admin123`
- **Role**: `admin`

⚠️ **Important**: Change the default password after first login!

## Troubleshooting

### If no users exist:
1. Run the seed script: `docker exec biosynth-backend npm run seed`
2. Or create a user: `docker exec biosynth-backend npm run create-user email@example.com password Name admin`

### If you forgot the password:
1. Connect to MySQL: `docker exec -it biosynth-mysql mysql -uroot -p`
2. Update password hash (you'll need to generate a bcrypt hash):
```sql
USE biosynth;
UPDATE users SET password_hash = '$2a$10$NewHashedPassword' WHERE email = 'your-email@example.com';
```

### Check database connection:
```bash
# Test database connection
docker exec biosynth-backend node -e "
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: 'mysql',
  user: 'root',
  password: process.env.DB_PASSWORD || 'biosynth_password',
  database: process.env.DB_NAME || 'biosynth'
}).then(() => console.log('✅ Connected')).catch(e => console.error('❌', e));
"
```

