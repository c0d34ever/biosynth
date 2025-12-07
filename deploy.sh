#!/bin/bash

# BioSynth Architect Deployment Script
# This script helps deploy the application to a server

set -e

echo "🚀 BioSynth Architect Deployment Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."
MISSING_DEPS=0

if ! command_exists node; then
    echo -e "${RED}✗ Node.js not found${NC}"
    MISSING_DEPS=1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"
fi

if ! command_exists npm; then
    echo -e "${RED}✗ npm not found${NC}"
    MISSING_DEPS=1
else
    echo -e "${GREEN}✓ npm installed${NC}"
fi

if [ "$MISSING_DEPS" -eq 1 ]; then
    echo -e "${RED}Please install missing dependencies${NC}"
    exit 1
fi

echo ""
echo "Select deployment method:"
echo "1) Docker Compose (Recommended)"
echo "2) Manual (VPS/Cloud)"
echo "3) Build only"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "🐳 Docker Compose Deployment"
        echo "============================"
        
        if ! command_exists docker; then
            echo -e "${RED}Docker not found. Please install Docker first.${NC}"
            exit 1
        fi
        
        if ! command_exists docker-compose; then
            echo -e "${RED}Docker Compose not found. Please install Docker Compose first.${NC}"
            exit 1
        fi
        
        # Check for .env file
        if [ ! -f .env ]; then
            echo -e "${YELLOW}⚠ .env file not found. Creating from template...${NC}"
            cat > .env << EOF
# Database
DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
DB_NAME=biosynth
DB_PORT=3306

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

# Gemini API Key (REQUIRED - update this!)
GEMINI_API_KEY=your-gemini-api-key-here

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Frontend Port
FRONTEND_PORT=5173
EOF
            echo -e "${YELLOW}⚠ Please edit .env file and set your GEMINI_API_KEY${NC}"
            read -p "Press Enter after updating .env file..."
        fi
        
        echo "Building and starting containers..."
        docker-compose build
        docker-compose up -d
        
        echo ""
        echo "Waiting for services to be ready..."
        sleep 10
        
        echo "Running database migrations..."
        docker exec -it biosynth-backend npm run migrate || echo "Migrations may have already run"
        
        echo ""
        echo -e "${GREEN}✅ Deployment complete!${NC}"
        echo ""
        echo "Services:"
        echo "  - Frontend: http://localhost:5173"
        echo "  - Backend: http://localhost:3001"
        echo "  - Health: http://localhost:3001/health"
        echo ""
        echo "View logs: docker-compose logs -f"
        echo "Stop: docker-compose down"
        ;;
        
    2)
        echo ""
        echo "🖥️  Manual Deployment"
        echo "===================="
        
        # Check for PM2
        if ! command_exists pm2; then
            echo "Installing PM2..."
            sudo npm install -g pm2
        fi
        
        # Backend deployment
        echo ""
        echo "📦 Deploying Backend..."
        cd backend
        
        if [ ! -f .env ]; then
            echo -e "${YELLOW}⚠ .env file not found in backend directory${NC}"
            echo "Please create backend/.env with required variables"
            exit 1
        fi
        
        echo "Installing dependencies..."
        npm ci --production
        
        echo "Building..."
        npm run build
        
        echo "Starting with PM2..."
        pm2 delete biosynth-backend 2>/dev/null || true
        pm2 start dist/index.js --name biosynth-backend
        pm2 save
        
        cd ..
        
        # Queue Worker deployment
        echo ""
        echo "📦 Deploying Queue Worker..."
        cd queue-worker
        
        if [ ! -f .env ]; then
            echo -e "${YELLOW}⚠ .env file not found in queue-worker directory${NC}"
            echo "Please create queue-worker/.env with required variables"
            exit 1
        fi
        
        echo "Installing dependencies..."
        npm ci --production
        
        echo "Building..."
        npm run build
        
        echo "Starting with PM2..."
        pm2 delete biosynth-queue-worker 2>/dev/null || true
        pm2 start dist/index.js --name biosynth-queue-worker
        pm2 save
        
        cd ..
        
        # Frontend deployment
        echo ""
        echo "📦 Building Frontend..."
        
        if [ ! -f .env.production ]; then
            echo -e "${YELLOW}⚠ .env.production not found. Creating...${NC}"
            read -p "Enter backend API URL (e.g., http://localhost:3001/api): " api_url
            echo "VITE_API_URL=$api_url" > .env.production
        fi
        
        echo "Installing dependencies..."
        npm ci
        
        echo "Building..."
        npm run build
        
        echo ""
        echo -e "${GREEN}✅ Build complete!${NC}"
        echo ""
        echo "Frontend build is in ./dist directory"
        echo "Deploy this directory to your web server (Nginx, Apache, etc.)"
        echo ""
        echo "PM2 Status:"
        pm2 list
        ;;
        
    3)
        echo ""
        echo "🔨 Build Only"
        echo "============="
        
        # Backend
        echo "Building Backend..."
        cd backend
        npm ci
        npm run build
        cd ..
        
        # Queue Worker
        echo "Building Queue Worker..."
        cd queue-worker
        npm ci
        npm run build
        cd ..
        
        # Frontend
        echo "Building Frontend..."
        if [ ! -f .env.production ]; then
            read -p "Enter backend API URL (e.g., http://localhost:3001/api): " api_url
            echo "VITE_API_URL=$api_url" > .env.production
        fi
        npm ci
        npm run build
        
        echo ""
        echo -e "${GREEN}✅ Build complete!${NC}"
        echo "  - Backend: ./backend/dist"
        echo "  - Queue Worker: ./queue-worker/dist"
        echo "  - Frontend: ./dist"
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "📚 For more details, see DEPLOYMENT.md"

