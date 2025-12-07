# Deployment Guide

This guide covers deploying the BioSynth Architect application (frontend + backend) to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Docker Deployment (Recommended)](#docker-deployment-recommended)
3. [Manual Deployment (VPS/Cloud)](#manual-deployment-vpscloud)
4. [Platform-Specific Deployments](#platform-specific-deployments)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Production Checklist](#production-checklist)

---

## Prerequisites

- **Node.js 20+** (for manual deployment)
- **Docker & Docker Compose** (for Docker deployment)
- **MySQL 8.0+** database
- **Redis** (optional, can be disabled)
- **Gemini API Key** (for AI features)
- **Domain name** (optional, for production)

---

## Docker Deployment (Recommended)

### Quick Start

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd biosynth-architect
```

2. **Create environment file:**
```bash
# Create .env file in root directory
cat > .env << EOF
# Database
DB_PASSWORD=your-secure-password
DB_NAME=biosynth
DB_PORT=3306

# JWT Secret (generate a strong random string)
JWT_SECRET=$(openssl rand -base64 32)

# Gemini API Key
GEMINI_API_KEY=your-gemini-api-key

# Frontend URL (update with your domain)
FRONTEND_URL=https://biosynth.youtilitybox.com

# Frontend Port
FRONTEND_PORT=80
EOF
```

3. **Start all services:**
```bash
docker-compose up -d
```

4. **Initialize database:**
```bash
# Run migrations
docker exec -it biosynth-backend npm run migrate

# Create admin user (optional)
docker exec -it biosynth-backend npm run create-user
```

5. **Access the application:**
- Frontend: http://localhost (or your domain)
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

### Docker Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Restart a service
docker-compose restart backend

# Update and rebuild
git pull
docker-compose build --no-cache
docker-compose up -d
```

### Production Docker Setup with Nginx

For production, use Nginx as a reverse proxy. See [NGINX_SETUP.md](./NGINX_SETUP.md) for detailed instructions.

**Quick setup:**
1. Uncomment the nginx service in `docker-compose.yml`
2. Copy `nginx.conf` and update domain name
3. Place SSL certificates in `./ssl/` directory
4. Run: `docker-compose up -d`

**Or use the automated setup script:**
```bash
chmod +x setup-nginx.sh
sudo ./setup-nginx.sh
```

---

## Manual Deployment (VPS/Cloud)

### Step 1: Server Setup

**Ubuntu/Debian:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server

# Install Redis (optional)
sudo apt install -y redis-server

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (for reverse proxy)
sudo apt install -y nginx
```

### Step 2: Database Setup

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE biosynth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'biosynth_user'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON biosynth.* TO 'biosynth_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Backend Deployment

```bash
# Clone repository
cd /var/www
sudo git clone <your-repo-url> biosynth-architect
cd biosynth-architect/backend

# Install dependencies
npm ci --production

# Create .env file
sudo nano .env
```

**Backend `.env` file:**
```env
PORT=3001
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=biosynth_user
DB_PASSWORD=your-secure-password
DB_NAME=biosynth

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Redis (optional)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Frontend URL
FRONTEND_URL=https://biosynth.youtilitybox.com

# Automation (optional)
AUTOMATION_ENABLED=true
AUTOMATION_CRON=0 2 * * *
GENERATION_CRON=0 3 * * *
SYNTHESIS_CRON=0 4 * * *
```

```bash
# Build backend
npm run build

# Run migrations
npm run migrate

# Start with PM2
pm2 start dist/index.js --name biosynth-backend
pm2 save
pm2 startup
```

### Step 4: Queue Worker Deployment

```bash
cd /var/www/biosynth-architect/queue-worker

# Install dependencies
npm ci --production

# Create .env file (same as backend, but only needs DB and Redis)
sudo nano .env
```

```bash
# Build
npm run build

# Start with PM2
pm2 start dist/index.js --name biosynth-queue-worker
pm2 save
```

### Step 5: Frontend Deployment

```bash
cd /var/www/biosynth-architect

# Install dependencies
npm ci

# Create .env.production file
sudo nano .env.production
```

**Frontend `.env.production` file:**
```env
VITE_API_URL=https://biosynth.youtilitybox.com/api
```

```bash
# Build frontend
npm run build

# The dist/ folder contains the production build
# Serve with Nginx (see Step 6)
```

### Step 6: Nginx Configuration

**Option 1: Automated Setup (Recommended)**
```bash
chmod +x setup-nginx.sh
sudo ./setup-nginx.sh
```

**Option 2: Manual Setup**

```bash
# Copy configuration file
sudo cp nginx.conf /etc/nginx/sites-available/biosynth

# Edit and update domain name
sudo nano /etc/nginx/sites-available/biosynth
# Replace 'biosynth.youtilitybox.com' with your actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/biosynth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**For detailed Nginx setup, see [NGINX_SETUP.md](./NGINX_SETUP.md)**

### Step 7: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d biosynth.youtilitybox.com -d www.biosynth.youtilitybox.com

# Auto-renewal is set up automatically
```

---

## Platform-Specific Deployments

### Vercel (Frontend) + Railway/Render (Backend)

#### Frontend on Vercel

1. **Connect repository to Vercel**
2. **Set environment variables:**
   - `VITE_API_URL`: Your backend API URL

3. **Build settings:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

#### Backend on Railway/Render

1. **Connect repository**
2. **Set root directory:** `backend`
3. **Build command:** `npm run build`
4. **Start command:** `npm start`
5. **Environment variables:**
   - All variables from `backend/.env`
   - Add MySQL database URL
   - Add Redis URL (if using)

### Railway (Full Stack)

1. **Create new project**
2. **Add services:**
   - MySQL database
   - Redis (optional)
   - Backend service
   - Frontend service
3. **Configure each service with appropriate environment variables**

### Render

1. **Create Web Service (Backend)**
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Environment: Node

2. **Create Static Site (Frontend)**
   - Root Directory: `.`
   - Build Command: `npm run build`
   - Publish Directory: `dist`

---

## Environment Variables

### Backend Required Variables

```env
# Server
PORT=3001
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=biosynth

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# AI Service
GEMINI_API_KEY=your-gemini-api-key

# Frontend URL (for CORS)
FRONTEND_URL=https://biosynth.youtilitybox.com

# Redis (optional)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379

# Automation (optional)
AUTOMATION_ENABLED=true
AUTOMATION_CRON=0 2 * * *
GENERATION_CRON=0 3 * * *
SYNTHESIS_CRON=0 4 * * *
```

### Frontend Required Variables

```env
VITE_API_URL=https://biosynth.youtilitybox.com/api
```

**📖 For detailed API URL configuration guide, see [API_URL_CONFIGURATION.md](./API_URL_CONFIGURATION.md)**

### Queue Worker Required Variables

```env
# Same as backend, but only needs:
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=biosynth
REDIS_HOST=localhost
REDIS_PORT=6379
GEMINI_API_KEY=your-gemini-api-key
```

---

## Database Setup

### Automatic Migration

The database schema is automatically created on first backend startup. However, you can also run migrations manually:

```bash
# Backend directory
npm run migrate
```

### Manual Schema Creation

If needed, you can create the schema manually by running the SQL from `backend/src/db/schema.ts`.

### Create Admin User

```bash
# Backend directory
npm run create-user
# Follow prompts to create admin user
```

Or via SQL:
```sql
INSERT INTO users (email, password_hash, name, role)
VALUES ('admin@biosynth.com', '$2a$10$...', 'Admin User', 'admin');
```

---

## Production Checklist

### Security

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Set secure CORS origins
- [ ] Enable rate limiting
- [ ] Use environment variables (never commit secrets)
- [ ] Keep dependencies updated
- [ ] Enable firewall (UFW/iptables)
- [ ] Disable Redis if not needed (set `REDIS_ENABLED=false`)

### Performance

- [ ] Enable gzip compression (Nginx)
- [ ] Set up CDN for static assets
- [ ] Configure caching headers
- [ ] Use PM2 cluster mode for backend
- [ ] Set up database connection pooling
- [ ] Monitor resource usage

### Monitoring

- [ ] Set up error logging (Sentry, LogRocket)
- [ ] Monitor server resources (CPU, RAM, Disk)
- [ ] Set up database backups
- [ ] Configure uptime monitoring
- [ ] Set up alerts for failures

### Backup

- [ ] Automated database backups (daily)
- [ ] Backup configuration files
- [ ] Test restore procedure

### Updates

- [ ] Set up CI/CD pipeline
- [ ] Test updates in staging
- [ ] Document rollback procedure
- [ ] Schedule maintenance windows

---

## Troubleshooting

### Backend won't start

1. Check environment variables
2. Verify database connection
3. Check port availability: `netstat -tulpn | grep 3001`
4. View logs: `pm2 logs biosynth-backend`

### Frontend can't connect to API

1. Verify `VITE_API_URL` is correct
2. Check CORS settings in backend
3. Verify backend is running
4. Check browser console for errors

### Database connection errors

1. Verify MySQL is running: `sudo systemctl status mysql`
2. Check credentials in `.env`
3. Verify user permissions
4. Check firewall rules

### Redis connection errors

1. If Redis is optional, set `REDIS_ENABLED=false`
2. Verify Redis is running: `redis-cli ping`
3. Check Redis configuration

---

## Maintenance

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
cd backend && npm ci && npm run build
pm2 restart biosynth-backend

cd ../queue-worker && npm ci && npm run build
pm2 restart biosynth-queue-worker

cd .. && npm ci && npm run build
# Restart Nginx or redeploy frontend
```

### Database Backup

```bash
# Daily backup script
mysqldump -u biosynth_user -p biosynth > backup_$(date +%Y%m%d).sql

# Restore
mysql -u biosynth_user -p biosynth < backup_20240101.sql
```

### Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
```

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs
3. Check GitHub issues
4. Contact support

