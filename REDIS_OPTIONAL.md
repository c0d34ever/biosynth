# Redis is Now Optional! 🎉

You can now run BioSynth Architect **without Redis**. Jobs will be processed **synchronously** instead of using a queue.

## How to Disable Redis

### Option 1: Set Environment Variable

In `backend/.env` and `queue-worker/.env`:
```env
REDIS_ENABLED=false
```

### Option 2: Don't Start Queue Worker

Simply **don't run** the queue-worker service. The backend will process jobs synchronously.

## How It Works

### With Redis (Default)
- Jobs are queued in Redis
- Queue worker processes jobs asynchronously
- Better for production with high load
- Jobs can be retried automatically

### Without Redis (Synchronous Mode)
- Jobs are processed immediately when created
- No queue worker needed
- Simpler setup for development
- Jobs still tracked in database

## Configuration

### `backend/.env`
```env
# Enable/disable Redis
REDIS_ENABLED=true   # Set to false to disable

# Redis settings (only used if REDIS_ENABLED=true)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### `queue-worker/.env`
```env
# Enable/disable Redis
REDIS_ENABLED=true   # Set to false to disable

# Redis settings (only used if REDIS_ENABLED=true)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Running Without Redis

### Step 1: Disable Redis
```env
# In backend/.env
REDIS_ENABLED=false
```

### Step 2: Start Services

**Only 2 services needed** (no queue worker):

**Window 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Window 2 - Frontend:**
```powershell
npm run dev
```

### Step 3: That's It!

The backend will:
- ✅ Process jobs synchronously
- ✅ Show: `ℹ️  Redis is disabled. Jobs will be processed synchronously.`
- ✅ No Redis connection errors
- ✅ All features work normally

## What Happens

When Redis is disabled:
1. Job is created in database (status: `pending`)
2. Job is processed **immediately** (status: `processing`)
3. Result is saved (status: `completed`)
4. Frontend can poll for results (same as before)

## Benefits

- ✅ **Simpler setup** - No Redis installation needed
- ✅ **Faster development** - Immediate job processing
- ✅ **No extra service** - One less thing to manage
- ✅ **Same API** - Frontend code doesn't change

## When to Use Each Mode

### Use Redis (Async Queue) When:
- Production environment
- High job volume
- Need job retries
- Want background processing
- Multiple workers needed

### Use Synchronous Mode When:
- Development/testing
- Low job volume
- Simple setup preferred
- Redis not available
- Single user scenarios

## Migration

To switch between modes:
1. Update `REDIS_ENABLED` in `.env` files
2. Restart backend service
3. That's it! No code changes needed.

The system automatically detects Redis availability and falls back to synchronous processing if Redis is unavailable.

