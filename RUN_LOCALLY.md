# Running BioSynth Architect Locally

Complete guide to run all services locally without Docker.

## Prerequisites

1. **Node.js 20+** - [Download](https://nodejs.org/)
2. **MySQL 8.0+** - [Download](https://dev.mysql.com/downloads/mysql/)
3. **Redis** - [Download](https://redis.io/download)

### Quick Install (macOS/Linux)
```bash
# Install MySQL
# macOS
brew install mysql
brew services start mysql

# Linux (Ubuntu/Debian)
sudo apt-get install mysql-server
sudo systemctl start mysql

# Install Redis
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

### Windows
- Download MySQL from [mysql.com](https://dev.mysql.com/downloads/installer/)
- Download Redis from [github.com/microsoftarchive/redis/releases](https://github.com/microsoftarchive/redis/releases)

## Step 1: Database Setup

### Create Database
```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE biosynth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

## Step 2: Environment Configuration

### Backend Environment
```bash
cd backend
cp env.example .env
```

Edit `backend/.env`:
```env
PORT=3001
NODE_ENV=development

# Database - Use your local MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=biosynth

# JWT Secret - Change this!
JWT_SECRET=your-super-secret-jwt-key-change-this

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Gemini AI - Your API key
GEMINI_API_KEY=your_gemini_api_key

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### Queue Worker Environment
```bash
cd queue-worker
cp env.example .env
```

Edit `queue-worker/.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=biosynth

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend Environment (Optional)
```bash
# In project root
cp .env.example .env.local
```

Edit `.env.local`:
```env
VITE_API_URL=http://localhost:3001/api
```

## Step 3: Install Dependencies

### Backend
```bash
cd backend
npm install
```

### Queue Worker
```bash
cd queue-worker
npm install
```

### Frontend
```bash
# In project root
npm install
```

## Step 4: Start Services

You'll need **4 terminal windows**:

### Terminal 1: MySQL
```bash
# macOS/Linux
mysql -u root -p

# Or if running as service
# macOS: brew services start mysql
# Linux: sudo systemctl start mysql
```

### Terminal 2: Redis
```bash
# macOS/Linux
redis-server

# Or if running as service
# macOS: brew services start redis
# Linux: sudo systemctl start redis
```

### Terminal 3: Backend
```bash
cd backend
npm run dev
```

You should see:
```
✅ Database connection established
✅ Database schema initialized
🚀 Backend server running on port 3001
```

### Terminal 4: Queue Worker
```bash
cd queue-worker
npm run dev
```

You should see:
```
🚀 Starting queue worker...
✅ Queue worker started and listening for jobs
```

### Terminal 5: Frontend
```bash
# In project root
npm run dev
```

You should see:
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

## Step 5: Create Admin User

In a new terminal:
```bash
cd backend
npm run seed
```

Or manually:
```bash
mysql -u root -p biosynth

INSERT INTO users (email, password_hash, name, role) 
VALUES (
  'admin@biosynth.com',
  '$2a$10$YourBcryptHashHere',
  'Admin',
  'admin'
);
```

## Step 6: Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Troubleshooting

### MySQL Connection Error
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1"

# Verify credentials in backend/.env match your MySQL setup
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Verify Redis host/port in backend/.env and queue-worker/.env
```

### Port Already in Use
```bash
# Find what's using the port
# macOS/Linux
lsof -i :3001
lsof -i :5173
lsof -i :6379

# Kill the process or change ports in .env files
```

### Database Schema Not Created
The schema is created automatically on first backend startup. If it fails:
```bash
# Check backend logs for errors
# Verify database exists and credentials are correct
```

### API Key Issues
- Verify `GEMINI_API_KEY` is set in both `backend/.env` and `queue-worker/.env`
- Check API key is valid and has credits
- Restart backend and queue-worker after changing

## Quick Start Script (Optional)

Create `start-local.sh`:
```bash
#!/bin/bash

echo "Starting BioSynth Architect locally..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js required"; exit 1; }
command -v mysql >/dev/null 2>&1 || { echo "MySQL required"; exit 1; }
command -v redis-server >/dev/null 2>&1 || { echo "Redis required"; exit 1; }

# Start services in background
echo "Starting backend..."
cd backend && npm run dev &
BACKEND_PID=$!

echo "Starting queue worker..."
cd ../queue-worker && npm run dev &
WORKER_PID=$!

echo "Starting frontend..."
cd .. && npm run dev &
FRONTEND_PID=$!

echo "Services started!"
echo "Backend PID: $BACKEND_PID"
echo "Worker PID: $WORKER_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Access at http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $WORKER_PID $FRONTEND_PID; exit" INT
wait
```

Make executable:
```bash
chmod +x start-local.sh
./start-local.sh
```

## Development Tips

### Hot Reload
- Backend: Uses `tsx watch` - auto-reloads on file changes
- Queue Worker: Uses `tsx watch` - auto-reloads on file changes
- Frontend: Vite HMR - auto-reloads on file changes

### Database Changes
- Schema changes require backend restart
- Use MySQL client to inspect database:
  ```bash
  mysql -u root -p biosynth
  SHOW TABLES;
  ```

### Debugging
- Backend logs: Check terminal 3
- Queue Worker logs: Check terminal 4
- Frontend console: Browser DevTools
- Database: Use MySQL client or GUI tool

### Testing API
```bash
# Health check
curl http://localhost:3001/health

# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

## Next Steps

1. Register a user at http://localhost:5173
2. Generate your first algorithm
3. Create a problem and add algorithms
4. Explore analytics and improvements

Happy coding! 🚀

