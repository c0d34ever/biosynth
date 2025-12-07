# Quick Deployment Guide

## 🚀 Fastest Way: Docker Compose

```bash
# 1. Create .env file
cat > .env << EOF
DB_PASSWORD=your-secure-password
DB_NAME=biosynth
JWT_SECRET=$(openssl rand -base64 32)
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:5173
EOF

# 2. Start everything
docker-compose up -d

# 3. Initialize database
docker exec -it biosynth-backend npm run migrate

# 4. Access
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

## 📦 Manual Deployment (3 Steps)

### Step 1: Backend
```bash
cd backend
npm ci
cp env.example .env
# Edit .env with your settings
npm run build
npm start
```

### Step 2: Queue Worker (Optional)
```bash
cd queue-worker
npm ci
cp env.example .env
# Edit .env (same as backend)
npm run build
npm start
```

### Step 3: Frontend
```bash
# Create .env.production
echo "VITE_API_URL=http://localhost:3001/api" > .env.production

# Build
npm ci
npm run build

# Serve (choose one):
# Option A: Nginx
sudo cp -r dist/* /var/www/html/

# Option B: Simple HTTP server
npx serve -s dist -l 5173
```

## 🌐 Production Deployment

### Using the deployment script:
```bash
chmod +x deploy.sh
./deploy.sh
```

### Manual production setup:

1. **Backend with PM2:**
```bash
cd backend
npm ci --production
npm run build
pm2 start dist/index.js --name biosynth-backend
pm2 save
```

2. **Frontend with Nginx:**
```bash
npm ci
npm run build

# Quick nginx setup
chmod +x setup-nginx.sh
sudo ./setup-nginx.sh

# Or manually copy config
sudo cp nginx.conf /etc/nginx/sites-available/biosynth
sudo ln -s /etc/nginx/sites-available/biosynth /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**For detailed nginx setup, see [NGINX_SETUP.md](./NGINX_SETUP.md)**

## 🔑 Required Environment Variables

### Backend (.env):
```env
PORT=3001
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=biosynth
JWT_SECRET=your-secret-key-min-32-chars
GEMINI_API_KEY=your-api-key
FRONTEND_URL=https://biosynth.youtilitybox.com
```

### Frontend (.env.production):
```env
VITE_API_URL=https://biosynth.youtilitybox.com/api
```

**📖 For detailed API URL configuration, see [API_URL_CONFIGURATION.md](./API_URL_CONFIGURATION.md)**

## 📋 Checklist

- [ ] Database created and accessible
- [ ] Environment variables set
- [ ] Backend builds successfully
- [ ] Frontend builds successfully
- [ ] Backend API accessible
- [ ] Frontend can connect to backend
- [ ] Nginx configured (production)
- [ ] SSL/HTTPS configured (production)
- [ ] Firewall rules configured
- [ ] Backups configured

## 🆘 Common Issues

**Backend won't start:**
- Check database connection
- Verify all env variables are set
- Check port 3001 is available

**Frontend can't connect:**
- Verify VITE_API_URL is correct
- Check CORS settings in backend
- Ensure backend is running

**Database errors:**
- Run migrations: `npm run migrate`
- Check database credentials
- Verify database exists

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

