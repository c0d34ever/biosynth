# Quick Guide: Disable Redis

## To Run Without Redis

### Step 1: Update `backend/.env`

Add or change:
```env
REDIS_ENABLED=false
```

### Step 2: Restart Backend

Stop the backend (Ctrl+C) and restart:
```powershell
cd backend
npm run dev
```

You should see:
```
ℹ️  Redis is disabled. Jobs will be processed synchronously.
✅ Database connection established
✅ Database schema initialized
🚀 Backend server running on port 3001
```

### Step 3: Skip Queue Worker

**You don't need to run the queue-worker service!** Jobs will be processed synchronously by the backend.

## That's It!

Now you only need:
- ✅ Backend service
- ✅ Frontend service
- ❌ No Redis needed
- ❌ No Queue Worker needed

Jobs will process immediately when created, no queue needed!

