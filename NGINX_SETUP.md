# Nginx Configuration Guide

This guide covers setting up Nginx as a reverse proxy for BioSynth Architect in production.

## Quick Setup

### Automated Setup (Linux)

```bash
# Make script executable
chmod +x setup-nginx.sh

# Run setup (requires sudo)
sudo ./setup-nginx.sh
```

The script will:
- Install Nginx (if needed)
- Configure the site
- Set up SSL with Let's Encrypt (optional)
- Enable and start the service

### Manual Setup

#### Step 1: Install Nginx

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y nginx
```

**CentOS/RHEL:**
```bash
sudo yum install -y nginx
```

#### Step 2: Copy Configuration

```bash
# For production (with SSL)
sudo cp nginx.conf /etc/nginx/sites-available/biosynth

# For development (HTTP only)
sudo cp nginx-dev.conf /etc/nginx/sites-available/biosynth
```

#### Step 3: Update Configuration

Edit `/etc/nginx/sites-available/biosynth`:

1. **Replace domain name:**
   ```nginx
   server_name biosynth.youtilitybox.com www.biosynth.youtilitybox.com;
   ```
   Replace `biosynth.youtilitybox.com` with your actual domain.

2. **Update frontend path:**
   ```nginx
   root /var/www/biosynth-architect/dist;
   ```
   Update to match your frontend build location.

3. **For SSL (production):**
   ```nginx
   ssl_certificate /etc/nginx/ssl/cert.pem;
   ssl_certificate_key /etc/nginx/ssl/key.pem;
   ```
   Update paths to your SSL certificates.

#### Step 4: Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/biosynth /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## SSL/HTTPS Setup

### Option 1: Let's Encrypt (Free, Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d biosynth.youtilitybox.com -d www.biosynth.youtilitybox.com

# Auto-renewal is set up automatically
# Test renewal: sudo certbot renew --dry-run
```

### Option 2: Manual SSL Certificates

1. **Place certificates:**
   ```bash
   sudo mkdir -p /etc/nginx/ssl
   sudo cp your-cert.pem /etc/nginx/ssl/cert.pem
   sudo cp your-key.pem /etc/nginx/ssl/key.pem
   sudo chmod 600 /etc/nginx/ssl/key.pem
   ```

2. **Update nginx.conf** with correct paths (already configured if using provided config)

## Configuration Files

### `nginx.conf` - Production Configuration

Features:
- ✅ HTTPS/SSL support
- ✅ HTTP to HTTPS redirect
- ✅ Security headers
- ✅ Rate limiting
- ✅ Gzip compression
- ✅ Static asset caching
- ✅ API proxy to backend
- ✅ SPA routing support

### `nginx-dev.conf` - Development Configuration

Features:
- ✅ Simple HTTP setup
- ✅ API proxy
- ✅ Basic compression
- ✅ No SSL (for local development)

## Key Features Explained

### 1. API Proxy

```nginx
location /api {
    proxy_pass http://backend;
    # ... proxy headers
}
```

Proxies all `/api/*` requests to the backend server (localhost:3001).

### 2. SPA Routing

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Ensures React Router routes work correctly by serving `index.html` for all routes.

### 3. Static Asset Caching

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

Caches static assets for 1 year to improve performance.

### 4. Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req zone=api_limit burst=20 nodelay;
```

Limits API requests to 10 per second per IP (with burst of 20).

### 5. Security Headers

```nginx
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
```

Adds security headers to protect against common attacks.

## Docker Setup with Nginx

If using Docker, you can add nginx as a service in `docker-compose.yml`:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
```

## Troubleshooting

### Nginx won't start

```bash
# Check configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### 502 Bad Gateway

- Check if backend is running: `curl http://localhost:3001/health`
- Verify backend port in nginx config matches backend port
- Check backend logs

### 404 for Frontend Routes

- Ensure `try_files $uri $uri/ /index.html;` is in the root location block
- Verify frontend build path is correct

### SSL Certificate Errors

- Verify certificate paths in nginx config
- Check certificate permissions: `sudo chmod 644 cert.pem && sudo chmod 600 key.pem`
- Ensure certificate is valid: `openssl x509 -in cert.pem -text -noout`

### API Requests Failing

- Check CORS settings in backend
- Verify `FRONTEND_URL` in backend `.env` matches your domain
- Check nginx proxy headers are set correctly

## Performance Optimization

### Enable HTTP/2

Already enabled in production config:
```nginx
listen 443 ssl http2;
```

### Enable Brotli Compression

Uncomment in `nginx.conf`:
```nginx
brotli on;
brotli_comp_level 6;
```

Requires nginx with brotli module:
```bash
sudo apt install -y nginx-module-brotli
```

### Tune Worker Processes

Add to `/etc/nginx/nginx.conf`:
```nginx
worker_processes auto;
worker_connections 1024;
```

## Monitoring

### View Access Logs

```bash
sudo tail -f /var/log/nginx/biosynth-access.log
```

### View Error Logs

```bash
sudo tail -f /var/log/nginx/biosynth-error.log
```

### Check Nginx Status

```bash
sudo systemctl status nginx
```

## Maintenance

### Reload Configuration

```bash
# Test first
sudo nginx -t

# Reload (zero downtime)
sudo systemctl reload nginx
```

### Restart Nginx

```bash
sudo systemctl restart nginx
```

### Update Frontend

```bash
# Build new frontend
npm run build

# Copy to nginx directory
sudo cp -r dist/* /var/www/biosynth-architect/dist/

# No need to restart nginx
```

## Security Best Practices

1. ✅ **Use HTTPS** - Always use SSL in production
2. ✅ **Keep Nginx Updated** - `sudo apt update && sudo apt upgrade nginx`
3. ✅ **Limit Rate** - Already configured in production config
4. ✅ **Security Headers** - Already configured
5. ✅ **Hide Nginx Version** - Add `server_tokens off;` to nginx.conf
6. ✅ **Firewall** - Only allow ports 80, 443, and SSH

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

