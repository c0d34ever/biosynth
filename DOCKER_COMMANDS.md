# Docker Commands Reference

Complete guide to Docker commands for BioSynth Architect deployment.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Docker Compose Commands](#docker-compose-commands)
3. [Individual Container Commands](#individual-container-commands)
4. [Building Images](#building-images)
5. [Managing Containers](#managing-containers)
6. [Database Operations](#database-operations)
7. [Logs and Debugging](#logs-and-debugging)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Start All Services
```bash
docker-compose up -d
```

### Stop All Services
```bash
docker-compose down
```

### View Status
```bash
docker-compose ps
```

### View Logs
```bash
docker-compose logs -f
```

---

## Docker Compose Commands

### Basic Operations

```bash
# Start all services in background
docker-compose up -d

# Start and rebuild images
docker-compose up -d --build

# Start specific service
docker-compose up -d backend
docker-compose up -d frontend
docker-compose up -d mysql
docker-compose up -d redis
docker-compose up -d queue-worker

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Stop specific service
docker-compose stop backend

# Restart specific service
docker-compose restart backend

# Restart all services
docker-compose restart
```

### Building

```bash
# Build all images
docker-compose build

# Build without cache
docker-compose build --no-cache

# Build specific service
docker-compose build backend
docker-compose build frontend

# Build and start
docker-compose up -d --build
```

### Status and Information

```bash
# List running containers
docker-compose ps

# View container status
docker-compose ps -a

# View resource usage
docker stats

# View network information
docker network ls
docker network inspect biosynth-architect_biosynth-network

# View volumes
docker volume ls
docker volume inspect biosynth-architect_mysql_data
```

### Logs

```bash
# View all logs
docker-compose logs

# Follow logs (live)
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
docker-compose logs -f queue-worker

# View last 100 lines
docker-compose logs --tail=100

# View logs with timestamps
docker-compose logs -f -t
```

### Environment Variables

```bash
# Check environment variables
docker-compose config

# Validate configuration
docker-compose config --quiet

# View environment for specific service
docker-compose run --rm backend env
```

---

## Individual Container Commands

### Backend Container

```bash
# Execute command in backend container
docker exec -it biosynth-backend sh

# Run database migrations
docker exec -it biosynth-backend npm run migrate

# Create admin user
docker exec -it biosynth-backend npm run create-user

# Check backend health
docker exec -it biosynth-backend curl http://localhost:3001/health

# View backend logs
docker logs -f biosynth-backend

# Restart backend
docker restart biosynth-backend

# Stop backend
docker stop biosynth-backend

# Start backend
docker start biosynth-backend
```

### Frontend Container

```bash
# Execute command in frontend container
docker exec -it biosynth-frontend sh

# View frontend logs
docker logs -f biosynth-frontend

# Restart frontend
docker restart biosynth-frontend
```

### MySQL Container

```bash
# Connect to MySQL
docker exec -it biosynth-mysql mysql -u root -p

# Connect to specific database
docker exec -it biosynth-mysql mysql -u root -p biosynth

# Backup database
docker exec biosynth-mysql mysqldump -u root -p biosynth > backup.sql

# Restore database
docker exec -i biosynth-mysql mysql -u root -p biosynth < backup.sql

# View MySQL logs
docker logs -f biosynth-mysql

# Access MySQL shell
docker exec -it biosynth-mysql bash
```

### Redis Container

```bash
# Connect to Redis CLI
docker exec -it biosynth-redis redis-cli

# Test Redis connection
docker exec -it biosynth-redis redis-cli ping

# View Redis info
docker exec -it biosynth-redis redis-cli info

# View Redis logs
docker logs -f biosynth-redis
```

### Queue Worker Container

```bash
# View queue worker logs
docker logs -f biosynth-queue-worker

# Restart queue worker
docker restart biosynth-queue-worker

# Execute command in queue worker
docker exec -it biosynth-queue-worker sh
```

---

## Building Images

### Build Individual Images

```bash
# Build backend
cd backend
docker build -t biosynth-backend:latest .

# Build frontend
docker build --build-arg VITE_API_URL=https://biosynth.youtilitybox.com/api -t biosynth-frontend:latest .

# Build queue worker
cd queue-worker
docker build -t biosynth-queue-worker:latest .
```

### Build with Tags

```bash
# Build with version tag
docker build -t biosynth-backend:v1.0.0 ./backend
docker build -t biosynth-frontend:v1.0.0 --build-arg VITE_API_URL=https://biosynth.youtilitybox.com/api .

# Build with multiple tags
docker build -t biosynth-backend:latest -t biosynth-backend:v1.0.0 ./backend
```

### Build Without Cache

```bash
# Force rebuild without cache
docker build --no-cache -t biosynth-backend:latest ./backend
docker-compose build --no-cache
```

---

## Managing Containers

### Container Lifecycle

```bash
# List all containers
docker ps -a

# List running containers
docker ps

# Start container
docker start biosynth-backend

# Stop container
docker stop biosynth-backend

# Restart container
docker restart biosynth-backend

# Remove container
docker rm biosynth-backend

# Remove stopped containers
docker container prune

# Force remove running container
docker rm -f biosynth-backend
```

### Container Inspection

```bash
# Inspect container
docker inspect biosynth-backend

# View container logs
docker logs biosynth-backend

# Follow logs
docker logs -f biosynth-backend

# View last N lines
docker logs --tail=50 biosynth-backend

# View logs with timestamps
docker logs -f -t biosynth-backend

# Execute command in running container
docker exec -it biosynth-backend sh
docker exec -it biosynth-backend bash

# View container resource usage
docker stats biosynth-backend

# View all container stats
docker stats
```

---

## Database Operations

### Backup and Restore

```bash
# Backup database
docker exec biosynth-mysql mysqldump -u root -p biosynth > backup_$(date +%Y%m%d).sql

# Backup with compression
docker exec biosynth-mysql mysqldump -u root -p biosynth | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore database
docker exec -i biosynth-mysql mysql -u root -p biosynth < backup.sql

# Restore compressed backup
gunzip < backup.sql.gz | docker exec -i biosynth-mysql mysql -u root -p biosynth
```

### Database Access

```bash
# Connect to MySQL
docker exec -it biosynth-mysql mysql -u root -p

# Connect to specific database
docker exec -it biosynth-mysql mysql -u root -p biosynth

# Run SQL command
docker exec -it biosynth-mysql mysql -u root -p -e "SHOW DATABASES;"

# Export table
docker exec biosynth-mysql mysqldump -u root -p biosynth users > users_backup.sql
```

### Database Migration

```bash
# Run migrations
docker exec -it biosynth-backend npm run migrate

# Check migration status
docker exec -it biosynth-backend npm run migrate -- --status
```

---

## Logs and Debugging

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
docker-compose logs -f redis
docker-compose logs -f queue-worker

# Last 100 lines
docker-compose logs --tail=100 backend

# Since specific time
docker-compose logs --since 30m backend

# With timestamps
docker-compose logs -f -t backend
```

### Debugging

```bash
# Enter container shell
docker exec -it biosynth-backend sh
docker exec -it biosynth-frontend sh

# Check container environment
docker exec biosynth-backend env

# Test network connectivity
docker exec biosynth-backend ping mysql
docker exec biosynth-backend ping redis

# Check port binding
docker port biosynth-backend

# View container processes
docker top biosynth-backend

# View container resource usage
docker stats biosynth-backend
```

---

## Production Deployment

### Initial Setup

```bash
# 1. Create .env file
cat > .env << EOF
DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
DB_NAME=biosynth
JWT_SECRET=$(openssl rand -base64 32)
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=https://biosynth.youtilitybox.com
VITE_API_URL=https://biosynth.youtilitybox.com/api
EOF

# 2. Build and start
docker-compose up -d --build

# 3. Wait for services to be ready
sleep 10

# 4. Run migrations
docker exec -it biosynth-backend npm run migrate

# 5. Create admin user (optional)
docker exec -it biosynth-backend npm run create-user
```

### Update Deployment

```bash
# 1. Pull latest code
git pull

# 2. Rebuild and restart
docker-compose up -d --build

# 3. Run migrations if needed
docker exec -it biosynth-backend npm run migrate

# 4. Restart services
docker-compose restart
```

### Clean Deployment

```bash
# Stop and remove everything
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Remove volumes (⚠️ deletes data)
docker volume rm biosynth-architect_mysql_data biosynth-architect_redis_data

# Clean build
docker-compose build --no-cache
docker-compose up -d
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps

# Try starting without detach to see errors
docker-compose up backend

# Check if port is in use
netstat -tulpn | grep 3001
lsof -i :3001
```

### Database Connection Issues

```bash
# Check MySQL is running
docker-compose ps mysql

# Test MySQL connection
docker exec -it biosynth-mysql mysql -u root -p -e "SELECT 1;"

# Check MySQL logs
docker-compose logs mysql

# Verify environment variables
docker exec biosynth-backend env | grep DB_
```

### Network Issues

```bash
# List networks
docker network ls

# Inspect network
docker network inspect biosynth-architect_biosynth-network

# Test connectivity between containers
docker exec biosynth-backend ping mysql
docker exec biosynth-backend ping redis

# Recreate network
docker-compose down
docker network prune
docker-compose up -d
```

### Volume Issues

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect biosynth-architect_mysql_data

# Remove volume (⚠️ deletes data)
docker volume rm biosynth-architect_mysql_data

# Backup volume data
docker run --rm -v biosynth-architect_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql_backup.tar.gz /data
```

### Performance Issues

```bash
# View resource usage
docker stats

# Limit container resources
# Edit docker-compose.yml:
# services:
#   backend:
#     deploy:
#       resources:
#         limits:
#           cpus: '1'
#           memory: 1G

# Check disk usage
docker system df

# Clean up unused resources
docker system prune
```

---

## Useful One-Liners

```bash
# Quick restart
docker-compose restart

# View all logs
docker-compose logs -f

# Clean everything
docker-compose down -v && docker system prune -a

# Rebuild and restart
docker-compose up -d --build

# Check health
docker exec biosynth-backend curl http://localhost:3001/health

# Backup database
docker exec biosynth-mysql mysqldump -u root -p biosynth > backup.sql

# View container resource usage
docker stats --no-stream

# List all images
docker images

# Remove unused images
docker image prune -a

# View container processes
docker top biosynth-backend

# Copy file from container
docker cp biosynth-backend:/app/file.txt ./file.txt

# Copy file to container
docker cp ./file.txt biosynth-backend:/app/file.txt
```

---

## Environment-Specific Commands

### Development

```bash
# Start with hot reload (if configured)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# View dev logs
docker-compose logs -f backend frontend
```

### Production

```bash
# Start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Enable auto-restart
docker update --restart=unless-stopped biosynth-backend
```

---

## Monitoring Commands

```bash
# Continuous monitoring
watch -n 1 'docker-compose ps'

# Resource monitoring
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Log monitoring
docker-compose logs -f --tail=50 | grep -i error

# Health check
docker exec biosynth-backend curl -f http://localhost:3001/health || echo "Backend unhealthy"
```

---

## Cleanup Commands

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Remove everything (⚠️ careful!)
docker system prune -a --volumes

# Remove specific image
docker rmi biosynth-backend:latest

# Remove specific volume
docker volume rm biosynth-architect_mysql_data
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start all | `docker-compose up -d` |
| Stop all | `docker-compose down` |
| View logs | `docker-compose logs -f` |
| Restart | `docker-compose restart` |
| Rebuild | `docker-compose build --no-cache` |
| Status | `docker-compose ps` |
| Shell access | `docker exec -it biosynth-backend sh` |
| Database backup | `docker exec biosynth-mysql mysqldump -u root -p biosynth > backup.sql` |
| View stats | `docker stats` |
| Clean up | `docker system prune` |

---

## Need Help?

- Check logs: `docker-compose logs -f`
- Verify status: `docker-compose ps`
- Test connectivity: `docker exec biosynth-backend ping mysql`
- View resources: `docker stats`
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more help

