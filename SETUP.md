# Setup Guide

## Quick Start with Docker

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` files and set:**
   - **Root `.env`** (for docker-compose): Database and service URLs
   - **`backend/.env`**: Copy from `backend/env.example`, set `GEMINI_API_KEY`, `JWT_SECRET`, `DB_PASSWORD`
   - **`queue-worker/.env`**: Copy from `queue-worker/env.example`, set `GEMINI_API_KEY`, `DB_PASSWORD`
   
   **Important**: `GEMINI_API_KEY` is only needed in backend and queue-worker services, NOT in the frontend!

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Create admin user (optional):**
   ```bash
   docker-compose exec backend npm run seed
   ```
   Or set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before first run.

5. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/health

## Manual Setup

### 1. Database Setup

Create MySQL database:
```sql
CREATE DATABASE biosynth;
```

The schema will be created automatically on first backend startup.

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
```

### 3. Queue Worker Setup

```bash
cd queue-worker
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
```

### 4. Frontend Setup

```bash
npm install
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:3001/api
npm run dev
```

## First Admin User

After starting the backend, create an admin user:

```bash
cd backend
npm run seed
```

Or register a user and manually update the database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Troubleshooting

### Database Connection Issues

- Ensure MySQL is running
- Check database credentials in `.env`
- Verify network connectivity between services

### Redis Connection Issues

- Ensure Redis is running
- Check Redis host/port in `.env`
- Verify Redis is accessible from backend and queue-worker

### API Key Issues

- Ensure `GEMINI_API_KEY` is set correctly
- Verify the API key is valid and has credits

### Port Conflicts

- Change ports in `docker-compose.yml` or `.env` if conflicts occur
- Ensure ports are not already in use

## Production Deployment

1. **Security:**
   - Change all default passwords
   - Use strong JWT secret
   - Enable SSL/TLS
   - Use environment-specific configs

2. **Database:**
   - Set up regular backups
   - Use connection pooling
   - Monitor performance

3. **Scaling:**
   - Run multiple queue-worker instances
   - Use load balancer for backend
   - Consider Redis cluster for high availability

4. **Monitoring:**
   - Set up logging aggregation
   - Monitor health endpoints
   - Track job queue metrics

