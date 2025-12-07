# API URL Configuration Guide

This guide explains where and how to set the API URL for the BioSynth Architect frontend.

## How It Works

The frontend reads the API URL from the environment variable `VITE_API_URL` at **build time**. This means:
- ✅ The URL is embedded in the built JavaScript files
- ✅ You must set it **before** building the frontend
- ❌ You **cannot** change it after building (without rebuilding)

**Location in code:** `services/api.ts`
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
```

---

## Where to Set the API URL

### 1. Local Development

**File:** `.env.local` or `.env` (in project root)

```env
VITE_API_URL=http://localhost:3001/api
```

**Note:** `.env.local` takes precedence over `.env` and is typically gitignored.

**Usage:**
```bash
# Start dev server
npm run dev
# Automatically uses VITE_API_URL from .env.local or .env
```

---

### 2. Production Build

**File:** `.env.production` (in project root)

```env
VITE_API_URL=https://api.biosynth.youtilitybox.com/api
# or
VITE_API_URL=https://biosynth.youtilitybox.com/api
```

**Usage:**
```bash
# Build with production environment
npm run build
# The built files will use the API URL from .env.production
```

**Important:** Create this file **before** running `npm run build`

---

### 3. Docker Deployment

**Option A: Environment Variable in docker-compose.yml**

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:3001/api}
    # ...
```

**Set in `.env` file (root level):**
```env
VITE_API_URL=http://backend:3001/api
# or for external access
VITE_API_URL=https://biosynth.youtilitybox.com/api
```

**Option B: Build Argument**

```bash
docker build --build-arg VITE_API_URL=https://api.biosynth.youtilitybox.com/api -t biosynth-frontend .
```

---

### 4. Platform-Specific Deployments

#### Vercel

**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add: `VITE_API_URL` = `https://biosynth.youtilitybox.com/api`
3. Redeploy

**Or via CLI:**
```bash
vercel env add VITE_API_URL
# Enter: https://biosynth.youtilitybox.com/api
```

#### Netlify

**In Netlify Dashboard:**
1. Site Settings → Environment Variables
2. Add: `VITE_API_URL` = `https://biosynth.youtilitybox.com/api`
3. Redeploy

**Or via `netlify.toml`:**
```toml
[build.environment]
  VITE_API_URL = "https://biosynth.youtilitybox.com/api"
```

#### Railway

**In Railway Dashboard:**
1. Project → Variables
2. Add: `VITE_API_URL` = `https://biosynth.youtilitybox.com/api`
3. Redeploy

---

## Common Scenarios

### Scenario 1: Local Development

```bash
# Create .env.local
echo "VITE_API_URL=http://localhost:3001/api" > .env.local

# Start dev server
npm run dev
```

### Scenario 2: Production with Same Domain

If frontend and backend are on the same domain (via Nginx):

```bash
# Create .env.production
echo "VITE_API_URL=/api" > .env.production

# Build
npm run build
```

**Nginx config handles the proxy:**
```nginx
location /api {
    proxy_pass http://backend:3001;
}
```

### Scenario 3: Production with Different Domains

```bash
# Create .env.production
echo "VITE_API_URL=https://api.biosynth.youtilitybox.com/api" > .env.production

# Build
npm run build
```

### Scenario 4: Docker Compose

```bash
# Create .env file in project root
cat > .env << EOF
VITE_API_URL=http://backend:3001/api
DB_PASSWORD=your-password
JWT_SECRET=your-secret
GEMINI_API_KEY=your-key
EOF

# Build and start
docker-compose up -d
```

### Scenario 5: Docker Build (Standalone)

```bash
# Build with API URL
docker build \
  --build-arg VITE_API_URL=https://api.biosynth.youtilitybox.com/api \
  -t biosynth-frontend .

# Run
docker run -p 80:80 biosynth-frontend
```

---

## Environment File Priority

Vite loads environment files in this order (higher priority overrides lower):

1. `.env.[mode].local` (e.g., `.env.production.local`)
2. `.env.[mode]` (e.g., `.env.production`)
3. `.env.local`
4. `.env`

**Example:**
- `.env.production.local` → Highest priority for production
- `.env.production` → Production defaults
- `.env.local` → Local overrides (gitignored)
- `.env` → Base defaults

---

## Verification

### Check Current API URL

**In Browser Console:**
```javascript
console.log(import.meta.env.VITE_API_URL);
```

**In Code:**
```typescript
// services/api.ts line 3
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
console.log('API URL:', API_BASE_URL);
```

### Test API Connection

```bash
# Check if backend is accessible
curl http://localhost:3001/health

# Or in browser
# Open: http://localhost:3001/health
```

---

## Troubleshooting

### Issue: API calls fail with CORS error

**Solution:** Update backend `FRONTEND_URL` in `backend/.env`:
```env
FRONTEND_URL=http://localhost:5173
# or
FRONTEND_URL=https://biosynth.youtilitybox.com
```

### Issue: API URL not updating after build

**Cause:** Vite embeds environment variables at build time.

**Solution:** 
1. Update `.env.production` with correct URL
2. Rebuild: `npm run build`
3. Redeploy the `dist/` folder

### Issue: API URL shows as undefined

**Cause:** Environment variable not set or not prefixed with `VITE_`

**Solution:**
- Ensure variable is named `VITE_API_URL` (not `API_URL`)
- Check file is in project root
- Restart dev server after creating `.env` file

### Issue: Docker build uses wrong URL

**Cause:** Build arg not passed correctly

**Solution:**
```bash
# Check Dockerfile has ARG
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Pass during build
docker build --build-arg VITE_API_URL=https://api.example.com/api .
```

---

## Quick Reference

| Environment | File | Example Value |
|------------|------|---------------|
| Local Dev | `.env.local` | `http://localhost:3001/api` |
| Production | `.env.production` | `https://biosynth.youtilitybox.com/api` |
| Docker | `.env` (root) | `http://backend:3001/api` |
| Docker Build | Build arg | `--build-arg VITE_API_URL=...` |
| Vercel | Dashboard/CLI | Environment Variable |
| Netlify | Dashboard/`netlify.toml` | Environment Variable |
| Railway | Dashboard | Environment Variable |

---

## Best Practices

1. ✅ **Never commit `.env.local`** - Add to `.gitignore`
2. ✅ **Use `.env.production`** for production builds
3. ✅ **Use relative paths** (`/api`) when using Nginx proxy
4. ✅ **Use full URLs** (`https://api.domain.com/api`) for separate domains
5. ✅ **Test API URL** before deploying
6. ✅ **Document API URL** in deployment docs

---

## Example Files

### `.env.local` (Development)
```env
VITE_API_URL=http://localhost:3001/api
```

### `.env.production` (Production)
```env
VITE_API_URL=https://api.biosynth.youtilitybox.com/api
```

### `.env` (Docker Compose)
```env
VITE_API_URL=http://backend:3001/api
DB_PASSWORD=your-password
JWT_SECRET=your-secret
GEMINI_API_KEY=your-key
```

---

## Need Help?

- Check browser console for API errors
- Verify backend is running: `curl http://localhost:3001/health`
- Check network tab in browser DevTools
- Review backend CORS settings
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more help

