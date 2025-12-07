# 🚀 Start Here - Run BioSynth Architect Locally

## Quick Setup (5 Minutes)

### Step 1: Check Prerequisites

You need:
- ✅ Node.js 20+ (check: `node --version`)
- ✅ MySQL running (your remote DB is configured)
- ✅ Redis running (or use remote)

### Step 2: Install Dependencies

Open PowerShell in project root and run:

```powershell
# Frontend
npm install

# Backend
cd backend
npm install
cd ..

# Queue Worker
cd queue-worker
npm install
cd ..
```

### Step 3: Configure Environment

**Update `backend/.env`** - Already created! Just verify:
- ✅ Database credentials (you have remote DB configured)
- ✅ Redis host (change to `localhost` if using local Redis)
- ✅ GEMINI_API_KEY is set

**Update `queue-worker/.env`** - Same settings as backend

### Step 4: Start Services

Open **3 separate PowerShell windows**:

#### Window 1: Backend
```powershell
cd C:\Users\ankit\Downloads\biosynth-architect\backend
npm run dev
```

#### Window 2: Queue Worker
```powershell
cd C:\Users\ankit\Downloads\biosynth-architect\queue-worker
npm run dev
```

#### Window 3: Frontend
```powershell
cd C:\Users\ankit\Downloads\biosynth-architect
npm run dev
```

### Step 5: Create Admin User

In a new PowerShell window:
```powershell
cd C:\Users\ankit\Downloads\biosynth-architect\backend
npm run seed
```

### Step 6: Access Application

- 🌐 **Frontend**: http://localhost:5173
- 🔌 **Backend API**: http://localhost:3001
- ❤️ **Health Check**: http://localhost:3001/health

## Using Your Remote Database

Your `.env` is already configured with:
- Database: `162.241.86.188`
- User: `youtigyk_bioalgo`

**Just make sure:**
1. Redis is accessible (update `REDIS_HOST` if needed)
2. Database allows connections from your IP
3. All services can reach the database

## Troubleshooting

### Backend won't start
- Check MySQL connection in `backend/.env`
- Verify database exists: `youtigyk_bioalgo`
- Check backend logs for errors

### Queue Worker won't start
- Check Redis connection
- Verify `REDIS_HOST` in `queue-worker/.env`
- Test: `redis-cli ping` (should return PONG)

### Frontend won't connect
- Check backend is running on port 3001
- Verify `VITE_API_URL` in frontend (defaults to `http://localhost:3001/api`)
- Check browser console for errors

## Quick Commands Reference

```powershell
# Check if services are running
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Stop all Node processes (if needed)
Get-Process node | Stop-Process

# Test backend
curl http://localhost:3001/health

# Test database connection
mysql -h 162.241.86.188 -u youtigyk_bioalgo -p
```

## What You'll See

### Backend (Window 1)
```
✅ Database connection established
✅ Database schema initialized
🚀 Backend server running on port 3001
```

### Queue Worker (Window 2)
```
🚀 Starting queue worker...
✅ Queue worker started and listening for jobs
```

### Frontend (Window 3)
```
VITE v6.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

## Next Steps

1. ✅ All 3 services running
2. ✅ Admin user created
3. 🎯 Open http://localhost:5173
4. 🎯 Login: `admin@biosynth.com` / `admin123`
5. 🎯 Start generating algorithms!

---

**Need help?** Check:
- `RUN_LOCALLY.md` - Detailed setup guide
- `QUICK_START_LOCAL.md` - Quick reference
- `TROUBLESHOOTING.md` - Common issues

