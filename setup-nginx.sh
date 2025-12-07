#!/bin/bash

# Nginx Setup Script for BioSynth Architect
# This script sets up nginx for production deployment

set -e

echo "🔧 Setting up Nginx for BioSynth Architect"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Please run as root (use sudo)${NC}"
   exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx not found. Installing...${NC}"
    apt update
    apt install -y nginx
fi

# Get domain name
read -p "Enter your domain name (e.g., biosynth.com): " domain
if [ -z "$domain" ]; then
    domain="localhost"
    echo -e "${YELLOW}Using localhost for development${NC}"
fi

# Get frontend build path
read -p "Enter frontend build path [/var/www/biosynth-architect/dist]: " frontend_path
frontend_path=${frontend_path:-/var/www/biosynth-architect/dist}

# Check if frontend build exists
if [ ! -d "$frontend_path" ]; then
    echo -e "${YELLOW}Frontend build not found at $frontend_path${NC}"
    read -p "Create directory? (y/n): " create_dir
    if [ "$create_dir" = "y" ]; then
        mkdir -p "$frontend_path"
        echo -e "${GREEN}Created directory: $frontend_path${NC}"
    else
        echo -e "${RED}Please build frontend first: npm run build${NC}"
        exit 1
    fi
fi

# Copy nginx config
echo "Copying nginx configuration..."
if [ "$domain" = "localhost" ]; then
    cp nginx-dev.conf /etc/nginx/sites-available/biosynth
else
    # Replace domain in nginx.conf
    sed "s/biosynth.youtilitybox.com/$domain/g" nginx.conf > /tmp/biosynth-nginx.conf
    sed -i "s/www.biosynth.youtilitybox.com/www.$domain/g" /tmp/biosynth-nginx.conf
    cp /tmp/biosynth-nginx.conf /etc/nginx/sites-available/biosynth
fi

# Update frontend path in config
sed -i "s|/var/www/biosynth-architect/dist|$frontend_path|g" /etc/nginx/sites-available/biosynth

# Enable site
if [ -L /etc/nginx/sites-enabled/biosynth ]; then
    rm /etc/nginx/sites-enabled/biosynth
fi
ln -s /etc/nginx/sites-available/biosynth /etc/nginx/sites-enabled/

# Remove default nginx site if exists
if [ -L /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Test nginx configuration
echo "Testing nginx configuration..."
if nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration has errors${NC}"
    exit 1
fi

# SSL setup (if not localhost)
if [ "$domain" != "localhost" ]; then
    echo ""
    read -p "Set up SSL with Let's Encrypt? (y/n): " setup_ssl
    if [ "$setup_ssl" = "y" ]; then
        if ! command -v certbot &> /dev/null; then
            echo "Installing Certbot..."
            apt install -y certbot python3-certbot-nginx
        fi
        
        echo "Obtaining SSL certificate..."
        certbot --nginx -d "$domain" -d "www.$domain" --non-interactive --agree-tos --email "admin@$domain" || {
            echo -e "${YELLOW}SSL setup failed. You can set it up manually later.${NC}"
        }
    else
        echo -e "${YELLOW}⚠ SSL not configured. Update nginx.conf with your SSL certificates.${NC}"
        echo "SSL certificates should be placed in /etc/nginx/ssl/"
        echo "  - cert.pem"
        echo "  - key.pem"
    fi
fi

# Set permissions
chown -R www-data:www-data "$frontend_path"
chmod -R 755 "$frontend_path"

# Reload nginx
echo "Reloading nginx..."
systemctl reload nginx

echo ""
echo -e "${GREEN}✅ Nginx setup complete!${NC}"
echo ""
echo "Configuration:"
echo "  - Config file: /etc/nginx/sites-available/biosynth"
echo "  - Frontend path: $frontend_path"
echo "  - Domain: $domain"
echo ""
echo "Useful commands:"
echo "  - Test config: sudo nginx -t"
echo "  - Reload: sudo systemctl reload nginx"
echo "  - Restart: sudo systemctl restart nginx"
echo "  - View logs: sudo tail -f /var/log/nginx/biosynth-error.log"
echo ""

