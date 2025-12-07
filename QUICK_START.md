# Quick Start Guide

Get BioSynth Architect running in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- A Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Step 1: Clone and Setup

```bash
# Navigate to project directory
cd biosynth-architect

# Copy environment files
cp .env.example .env
cp backend/env.example backend/.env
cp queue-worker/env.example queue-worker/.env
```

## Step 2: Configure Environment

Edit `backend/.env` and `queue-worker/.env`:

```env
# Required: Add your Gemini API key
GEMINI_API_KEY=your_actual_api_key_here

# Required: Set a strong JWT secret
JWT_SECRET=your-random-secret-key-here

# Database password (change from default)
DB_PASSWORD=your_secure_password
```

Edit root `.env`:
```env
# Match the password you set above
DB_PASSWORD=your_secure_password
```

## Step 3: Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Step 4: Create Admin User

```bash
# Option 1: Use seed script (recommended)
docker-compose exec backend npm run seed

# Option 2: Set in backend/.env before starting
ADMIN_EMAIL=admin@biosynth.com
ADMIN_PASSWORD=admin123
```

## Step 5: Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## First Login

1. Go to http://localhost:5173
2. Click "Sign up" or use admin credentials if you created one
3. Start generating algorithms!

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs backend
docker-compose logs queue-worker
docker-compose logs mysql

# Restart services
docker-compose restart
```

### Database connection errors
```bash
# Check MySQL is running
docker-compose ps mysql

# Verify credentials in backend/.env match root .env
# Ensure DB_PASSWORD matches in both files
```

### API key errors
- Verify `GEMINI_API_KEY` is set in both `backend/.env` and `queue-worker/.env`
- Check API key is valid and has credits
- View logs: `docker-compose logs queue-worker`

### Port conflicts
Edit `docker-compose.yml` to change ports:
```yaml
ports:
  - "3002:3001"  # Change 3001 to 3002
```

## Next Steps

- Read [SETUP.md](SETUP.md) for detailed setup
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
- See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for database structure

## Development Mode

For local development without Docker:

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Queue Worker
cd queue-worker
npm install
npm run dev

# Terminal 3: Frontend
npm install
npm run dev
```

Make sure MySQL and Redis are running locally!

