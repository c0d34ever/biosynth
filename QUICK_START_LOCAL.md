# Quick Start - Run Locally (Windows)

## Prerequisites Check

Make sure you have:
- ✅ Node.js 20+ installed
- ✅ MySQL running (or use remote database)
- ✅ Redis running (or use remote Redis)

## Step 1: Configure Environment

Your `.env` files are already created. **IMPORTANT**: Update them for local development:

### `backend/.env`
```env
PORT=3001
NODE_ENV=development

# Database - Use localhost for local MySQL, or keep remote
DB_HOST=localhost          # Change to localhost if using local MySQL
DB_PORT=3306
DB_USER=root              # Your local MySQL user
DB_PASSWORD=your_password # Your local MySQL password
DB_NAME=biosynth          # Create this database locally

# OR keep your remote database:
# DB_HOST=162.241.86.188
# DB_USER=youtigyk_bioalgo
# DB_PASSWORD=Sun12day46fun
# DB_NAME=youtigyk_bioalgo

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Redis - Use localhost for local Redis
REDIS_HOST=localhost      # Change to localhost if using local Redis
REDIS_PORT=6379

# Gemini AI
GEMINI_API_KEY=AIzaSyBq34MoOQ3NBHhJ1TQZD-vxeLSJM86Dog4

# Frontend
FRONTEND_URL=http://localhost:5173
```

### `queue-worker/.env`
```env
# Same database and Redis settings as backend
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=biosynth

REDIS_HOST=localhost
REDIS_PORT=6379

GEMINI_API_KEY=AIzaSyBq34MoOQ3NBHhJ1TQZD-vxeLSJM86Dog4
```

## Step 2: Create Local Database (if using local MySQL)

```sql
CREATE DATABASE biosynth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or use your existing remote database (already configured).

## Step 3: Start Services

Open **3 separate PowerShell/Command Prompt windows**:

### Window 1: Backend
```powershell
cd backend
npm run dev
```

Wait for: `🚀 Backend server running on port 3001`

### Window 2: Queue Worker
```powershell
cd queue-worker
npm run dev
```

Wait for: `✅ Queue worker started and listening for jobs`

### Window 3: Frontend
```powershell
npm run dev
```

Wait for: `Local: http://localhost:5173/`

## Step 4: Create Admin User

In a new terminal:
```powershell
cd backend
npm run seed
```

This creates:
- Email: `admin@biosynth.com`
- Password: `admin123`

## Step 5: Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Using Remote Database/Redis

If you want to use your remote database and Redis:

1. Keep the remote settings in `.env` files
2. Make sure Redis is accessible at the remote host
3. Start services as above

## Troubleshooting

### "Cannot connect to MySQL"
- Check MySQL is running: `mysql -u root -p`
- Verify credentials in `backend/.env`
- If using remote: Check firewall/network access

### "Cannot connect to Redis"
- Check Redis is running: `redis-cli ping`
- If using remote: Update `REDIS_HOST` in `.env` files
- Default Redis port: 6379

### "Port already in use"
- Change port in `.env`: `PORT=3002`
- Or kill process using port

### "Database schema not created"
- Schema auto-creates on first backend startup
- Check backend logs for errors
- Verify database exists and user has permissions

## Quick Commands

```powershell
# Install all dependencies
npm install
cd backend; npm install; cd ..
cd queue-worker; npm install; cd ..

# Start all (manual - 3 windows needed)
# Window 1: cd backend; npm run dev
# Window 2: cd queue-worker; npm run dev  
# Window 3: npm run dev

# Create admin
cd backend; npm run seed
```

## Next Steps

1. ✅ Services running
2. ✅ Admin user created
3. 🎯 Open http://localhost:5173
4. 🎯 Login with admin credentials
5. 🎯 Start generating algorithms!

