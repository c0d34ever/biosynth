# Environment Variables Setup

## Why Frontend Doesn't Need Gemini API Key

The frontend **does NOT need** the Gemini API key because:

1. **Security**: API keys should never be exposed in frontend code (they're visible in browser)
2. **Architecture**: All AI processing happens in backend/queue-worker services
3. **Flow**: Frontend → Backend API → Queue Worker → Gemini API

The frontend only needs:
- `VITE_API_URL` - URL of the backend API (default: `http://localhost:3001/api`)

## Environment Files Location

### 1. Root `.env` (for Docker Compose)
```bash
cp .env.example .env
```
Used by `docker-compose.yml` to pass variables to all services.

### 2. Backend `.env`
```bash
cp backend/env.example backend/.env
```
**Required variables:**
- `GEMINI_API_KEY` - Your Google Gemini API key ⚠️ **REQUIRED**
- `JWT_SECRET` - Secret for JWT tokens ⚠️ **CHANGE IN PRODUCTION**
- `DB_PASSWORD` - MySQL password
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME` - Database connection
- `REDIS_HOST`, `REDIS_PORT` - Redis connection
- `FRONTEND_URL` - Frontend URL for CORS

### 3. Queue Worker `.env`
```bash
cp queue-worker/env.example queue-worker/.env
```
**Required variables:**
- `GEMINI_API_KEY` - Your Google Gemini API key ⚠️ **REQUIRED**
- `DB_PASSWORD` - MySQL password
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME` - Database connection
- `REDIS_HOST`, `REDIS_PORT` - Redis connection

### 4. Frontend `.env.local` (optional, for local dev)
```bash
cp .env.example .env.local
```
**Only needed variable:**
- `VITE_API_URL` - Backend API URL (default: `http://localhost:3001/api`)

## Quick Setup

```bash
# 1. Root level (for docker-compose)
cp .env.example .env

# 2. Backend
cp backend/env.example backend/.env
# Edit backend/.env and add your GEMINI_API_KEY

# 3. Queue Worker  
cp queue-worker/env.example queue-worker/.env
# Edit queue-worker/.env and add your GEMINI_API_KEY

# 4. Frontend (optional, only for local dev without docker)
# No .env needed - uses VITE_API_URL from docker-compose or defaults
```

## Security Notes

- ✅ **DO**: Keep API keys in backend/queue-worker `.env` files
- ✅ **DO**: Add `.env` to `.gitignore` (already done)
- ❌ **DON'T**: Put API keys in frontend code
- ❌ **DON'T**: Commit `.env` files to git
- ⚠️ **CHANGE**: `JWT_SECRET` to a strong random string in production

