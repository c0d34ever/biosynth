# Troubleshooting Guide

## Common Issues and Solutions

### 1. Docker Services Won't Start

**Problem**: Services fail to start or crash immediately

**Solutions**:
```bash
# Check what's wrong
docker-compose logs

# Check specific service
docker-compose logs backend
docker-compose logs mysql
docker-compose logs redis

# Restart all services
docker-compose down
docker-compose up -d

# Rebuild if needed
docker-compose build --no-cache
docker-compose up -d
```

### 2. Database Connection Errors

**Error**: `ECONNREFUSED` or `Access denied`

**Solutions**:
- Verify MySQL is running: `docker-compose ps mysql`
- Check credentials in `backend/.env`:
  ```env
  DB_HOST=mysql
  DB_USER=root
  DB_PASSWORD=your_password  # Must match root .env
  ```
- Ensure password matches in root `.env` and `backend/.env`
- Wait for MySQL to be healthy: `docker-compose ps` (check health status)

### 3. Redis Connection Errors

**Error**: `Redis connection failed`

**Solutions**:
- Check Redis is running: `docker-compose ps redis`
- Verify Redis config in `backend/.env`:
  ```env
  REDIS_HOST=redis
  REDIS_PORT=6379
  ```
- Test Redis connection:
  ```bash
  docker-compose exec redis redis-cli ping
  # Should return: PONG
  ```

### 4. API Key Not Working

**Error**: `GEMINI_API_KEY not set` or `Invalid API key`

**Solutions**:
- Verify key is set in **both** `backend/.env` AND `queue-worker/.env`
- Check for typos or extra spaces
- Verify API key is valid: https://makersuite.google.com/app/apikey
- Check API key has credits/quota remaining
- Restart services after changing env:
  ```bash
  docker-compose restart backend queue-worker
  ```

### 5. Frontend Can't Connect to Backend

**Error**: `Failed to fetch` or CORS errors

**Solutions**:
- Check backend is running: `docker-compose ps backend`
- Verify `VITE_API_URL` in frontend (or use default)
- Check CORS config in `backend/src/index.ts`:
  ```typescript
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
  ```
- Ensure `FRONTEND_URL` in `backend/.env` matches frontend URL
- Check browser console for specific error

### 6. Jobs Stuck in "Pending"

**Problem**: Jobs never process

**Solutions**:
- Check queue-worker is running: `docker-compose ps queue-worker`
- Check queue-worker logs: `docker-compose logs queue-worker`
- Verify Redis connection (see #3)
- Check for errors in logs
- Restart queue-worker:
  ```bash
  docker-compose restart queue-worker
  ```

### 7. Port Already in Use

**Error**: `Port 3001 is already allocated` or similar

**Solutions**:
- Find what's using the port:
  ```bash
  # Windows
  netstat -ano | findstr :3001
  
  # Linux/Mac
  lsof -i :3001
  ```
- Change port in `docker-compose.yml`:
  ```yaml
  ports:
    - "3002:3001"  # Use 3002 instead
  ```
- Update `VITE_API_URL` in frontend if backend port changed

### 8. Database Schema Not Created

**Problem**: Tables don't exist

**Solutions**:
- Check backend logs for schema creation:
  ```bash
  docker-compose logs backend | grep -i schema
  ```
- Manually trigger schema creation:
  ```bash
  docker-compose exec backend npm run migrate
  ```
- Or restart backend (schema auto-creates on startup)

### 9. Authentication Not Working

**Problem**: Can't login or register

**Solutions**:
- Check JWT_SECRET is set in `backend/.env`
- Verify password hashing (check backend logs)
- Clear browser localStorage and try again
- Check backend logs for auth errors:
  ```bash
  docker-compose logs backend | grep -i auth
  ```

### 10. Admin Panel Not Accessible

**Problem**: 403 Forbidden when accessing admin routes

**Solutions**:
- Verify user role is 'admin' in database:
  ```sql
  SELECT email, role FROM users WHERE email = 'your@email.com';
  ```
- Update user role:
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
  ```
- Logout and login again to refresh JWT token

### 11. Container Keeps Restarting

**Problem**: Container status shows "Restarting"

**Solutions**:
```bash
# Check why it's crashing
docker-compose logs <service-name>

# Common causes:
# - Missing environment variables
# - Database not ready (add depends_on healthcheck)
# - Port conflicts
# - Invalid configuration
```

### 12. Data Not Persisting

**Problem**: Data lost after container restart

**Solutions**:
- Verify volumes are mounted in `docker-compose.yml`:
  ```yaml
  volumes:
    - mysql_data:/var/lib/mysql
  ```
- Check volumes exist: `docker volume ls`
- Don't use `docker-compose down -v` (removes volumes)

### 13. Slow Performance

**Problem**: Slow API responses or job processing

**Solutions**:
- Check database indexes (already created, but verify)
- Monitor resource usage: `docker stats`
- Increase container resources if needed
- Check for slow queries in MySQL logs
- Verify Redis is working (queue processing)

### 14. Build Errors

**Problem**: Docker build fails

**Solutions**:
```bash
# Clear build cache
docker-compose build --no-cache

# Check for syntax errors in Dockerfiles
# Verify all files exist (package.json, etc.)

# Check Node version compatibility
# Ensure all dependencies are listed in package.json
```

## Getting Help

1. **Check Logs First**:
   ```bash
   docker-compose logs --tail=100
   ```

2. **Verify Environment Variables**:
   ```bash
   docker-compose exec backend env | grep -E "DB_|REDIS_|JWT_|GEMINI_"
   ```

3. **Test Database Connection**:
   ```bash
   docker-compose exec backend npm run migrate
   ```

4. **Test Redis Connection**:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

5. **Check Service Health**:
   ```bash
   curl http://localhost:3001/health
   ```

## Debug Mode

Enable verbose logging:

```bash
# Backend
NODE_ENV=development docker-compose up backend

# Queue Worker
NODE_ENV=development docker-compose up queue-worker
```

## Reset Everything

**⚠️ WARNING: This deletes all data!**

```bash
# Stop and remove everything
docker-compose down -v

# Remove all containers, volumes, networks
docker system prune -a --volumes

# Start fresh
docker-compose up -d
```

