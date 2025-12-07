# How to Create a User in BioSynth Database

## Quick Solution

If you can't find your user in the database, you need to create one. Here are several methods:

## Method 1: Using Backend Container (Docker Running)

```bash
# Check existing users
docker exec biosynth-backend npm run check-users

# Create default admin user
docker exec biosynth-backend npm run seed

# Create custom user
docker exec biosynth-backend npm run create-user your-email@example.com your-password YourName admin
```

## Method 2: Direct MySQL Connection

### If using Docker MySQL:
```bash
# Connect to MySQL container
docker exec -it biosynth-mysql mysql -uroot -pbiosynth_password biosynth

# Then run:
SELECT id, email, name, role FROM users;
```

### If using remote MySQL (from env.example):
```bash
# Connect to remote MySQL
mysql -h 162.241.86.188 -u youtigyk_bioalgo -p youtigyk_bioalgo

# Enter password: Sun12day46fun
```

Then run SQL:
```sql
-- Check users
SELECT id, email, name, role, created_at FROM users;

-- Create user (you'll need to hash the password with bcrypt)
-- Better to use the create-user script
```

## Method 3: Using Backend Scripts (Local Development)

If you have the backend running locally (not in Docker):

```bash
cd backend

# Check users
npm run check-users

# Create default admin
npm run seed

# Create custom user
npm run create-user your-email@example.com your-password YourName admin
```

## Method 4: Create User via API (After Backend is Running)

Once the backend is running, you can register via the API:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password",
    "name": "Your Name"
  }'
```

## Method 5: SQL Direct Insert (Advanced)

⚠️ **Warning**: You need to hash the password with bcrypt. Use the scripts above instead.

If you must use SQL directly, you need to generate a bcrypt hash first:

```sql
-- This won't work directly - password needs bcrypt hash
-- Use the create-user script instead!
```

## Troubleshooting

### Database Connection Issues

1. **Check if MySQL is running:**
   ```bash
   docker ps | grep mysql
   ```

2. **Check database connection from backend:**
   ```bash
   docker exec biosynth-backend node -e "
   const mysql = require('mysql2/promise');
   mysql.createConnection({
     host: process.env.DB_HOST || 'mysql',
     user: process.env.DB_USER || 'root',
     password: process.env.DB_PASSWORD || 'biosynth_password',
     database: process.env.DB_NAME || 'biosynth'
   }).then(() => console.log('✅ Connected')).catch(e => console.error('❌', e));
   "
   ```

3. **Check if users table exists:**
   ```sql
   SHOW TABLES LIKE 'users';
   DESCRIBE users;
   ```

### If No Users Table Exists

The database might not be initialized. Run:

```bash
# This should happen automatically when backend starts
# But you can check backend logs:
docker logs biosynth-backend | grep -i "database\|schema\|table"
```

## Default Credentials (After Seed)

If you run `npm run seed`:
- **Email**: `admin@biosynth.com`
- **Password**: `admin123`
- **Role**: `admin`

⚠️ **Change the password immediately after first login!**

