# Fix "Invalid Credentials" Login Error

## Quick Solutions

### Option 1: Create Admin User (Recommended)

Run the seed script to create the default admin user:

```powershell
cd backend
npm run seed
```

This creates:
- **Email**: `admin@biosynth.com`
- **Password**: `admin123`
- **Role**: `admin`

### Option 2: Create Custom User

```powershell
cd backend
npm run create-user your@email.com yourpassword YourName admin
```

Or use environment variables in `backend/.env`:
```env
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=yourpassword
```

Then run:
```powershell
npm run seed
```

### Option 3: Register Through UI

1. Go to http://localhost:5173
2. Click "Sign up" (if you see login screen)
3. Create a new account
4. Login with your new credentials

## Troubleshooting

### Check if User Exists

Connect to your database and check:
```sql
SELECT id, email, role FROM users;
```

### Verify Password Hashing

The system uses bcrypt. Make sure:
- Password is at least 6 characters
- Email format is valid
- No extra spaces in email/password

### Common Issues

1. **No users in database**
   - Solution: Run `npm run seed` in backend folder

2. **Wrong email/password**
   - Solution: Use exact credentials from seed output
   - Default: `admin@biosynth.com` / `admin123`

3. **Database connection issue**
   - Check `backend/.env` database settings
   - Verify database is accessible

4. **Backend not running**
   - Make sure backend is running on port 3001
   - Check: http://localhost:3001/health

## Test Login via API

You can test login directly:

```powershell
# Test login
curl -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@biosynth.com\",\"password\":\"admin123\"}'
```

Should return:
```json
{
  "token": "...",
  "user": {
    "id": 1,
    "email": "admin@biosynth.com",
    "name": "Admin",
    "role": "admin"
  }
}
```

## Reset Password

If you need to reset a user's password:

```sql
-- Connect to database
mysql -h 162.241.86.188 -u youtigyk_bioalgo -p

-- Update password (replace with new bcrypt hash)
UPDATE users 
SET password_hash = '$2a$10$NEW_BCRYPT_HASH_HERE' 
WHERE email = 'admin@biosynth.com';
```

Or delete and recreate:
```sql
DELETE FROM users WHERE email = 'admin@biosynth.com';
```

Then run `npm run seed` again.

