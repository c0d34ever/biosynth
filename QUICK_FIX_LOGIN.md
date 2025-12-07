# Quick Fix: Invalid Credentials

## Most Likely Cause

**No user exists in the database yet!** You need to create a user first.

## Solution: Create Admin User

### Step 1: Run Seed Script

```powershell
cd backend
npm run seed
```

This creates:
- **Email**: `admin@biosynth.com`
- **Password**: `admin123`
- **Role**: `admin`

### Step 2: Login

Go to http://localhost:5173 and login with:
- Email: `admin@biosynth.com`
- Password: `admin123`

## Alternative: Register New User

1. Go to http://localhost:5173
2. Click "Sign up" (bottom of login form)
3. Enter your email, password (min 6 chars), and name
4. Click "Sign Up"
5. You'll be automatically logged in

## Check Existing Users

To see what users exist:

```powershell
cd backend
npm run check-users
```

## Create Custom User

```powershell
cd backend
npm run create-user your@email.com yourpassword YourName admin
```

## Verify Backend is Running

Make sure backend is running and accessible:
- Check: http://localhost:3001/health
- Should return: `{"status":"ok","timestamp":"..."}`

## Still Not Working?

1. **Check backend logs** - Look for errors in the backend terminal
2. **Check database connection** - Verify `backend/.env` has correct database settings
3. **Test API directly**:
   ```powershell
   curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"admin@biosynth.com\",\"password\":\"admin123\"}'
   ```
4. **Check browser console** - Open DevTools (F12) and check for errors

## Common Mistakes

- ❌ Using wrong email (case-sensitive)
- ❌ Extra spaces in email/password
- ❌ Password less than 6 characters
- ❌ Backend not running
- ❌ Wrong API URL in frontend

