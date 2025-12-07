# BioSynth Architect Deployment Script (PowerShell)
# For Windows systems

Write-Host "🚀 BioSynth Architect Deployment Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "✗ Node.js not found" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
} else {
    $nodeVersion = node -v
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "✗ npm not found" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✓ npm installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Select deployment method:"
Write-Host "1) Docker Compose (Recommended)"
Write-Host "2) Manual Build"
Write-Host "3) Build only"
$choice = Read-Host "Enter choice [1-3]"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🐳 Docker Compose Deployment" -ForegroundColor Cyan
        Write-Host "============================" -ForegroundColor Cyan
        
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Host "Docker not found. Please install Docker Desktop first." -ForegroundColor Red
            exit 1
        }
        
        if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
            Write-Host "Docker Compose not found. Please install Docker Compose first." -ForegroundColor Red
            exit 1
        }
        
        # Check for .env file
        if (-not (Test-Path .env)) {
            Write-Host "⚠ .env file not found. Creating from template..." -ForegroundColor Yellow
            
            $dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object {[char]$_})
            $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
            
            @"
# Database
DB_PASSWORD=$dbPassword
DB_NAME=biosynth
DB_PORT=3306

# JWT Secret
JWT_SECRET=$jwtSecret

# Gemini API Key (REQUIRED - update this!)
GEMINI_API_KEY=your-gemini-api-key-here

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Frontend Port
FRONTEND_PORT=5173
"@ | Out-File -FilePath .env -Encoding UTF8
            
            Write-Host "⚠ Please edit .env file and set your GEMINI_API_KEY" -ForegroundColor Yellow
            Read-Host "Press Enter after updating .env file"
        }
        
        Write-Host "Building and starting containers..." -ForegroundColor Yellow
        docker-compose build
        docker-compose up -d
        
        Write-Host ""
        Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        Write-Host "Running database migrations..." -ForegroundColor Yellow
        docker exec -it biosynth-backend npm run migrate
        
        Write-Host ""
        Write-Host "✅ Deployment complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Services:"
        Write-Host "  - Frontend: http://localhost:5173"
        Write-Host "  - Backend: http://localhost:3001"
        Write-Host "  - Health: http://localhost:3001/health"
        Write-Host ""
        Write-Host "View logs: docker-compose logs -f"
        Write-Host "Stop: docker-compose down"
    }
    
    "2" {
        Write-Host ""
        Write-Host "🔨 Manual Build" -ForegroundColor Cyan
        Write-Host "==============" -ForegroundColor Cyan
        
        # Backend
        Write-Host "Building Backend..." -ForegroundColor Yellow
        Set-Location backend
        if (-not (Test-Path .env)) {
            Write-Host "⚠ .env file not found in backend directory" -ForegroundColor Red
            Write-Host "Please create backend/.env with required variables" -ForegroundColor Yellow
            exit 1
        }
        npm ci
        npm run build
        Set-Location ..
        
        # Queue Worker
        Write-Host "Building Queue Worker..." -ForegroundColor Yellow
        Set-Location queue-worker
        if (-not (Test-Path .env)) {
            Write-Host "⚠ .env file not found in queue-worker directory" -ForegroundColor Red
            Write-Host "Please create queue-worker/.env with required variables" -ForegroundColor Yellow
            exit 1
        }
        npm ci
        npm run build
        Set-Location ..
        
        # Frontend
        Write-Host "Building Frontend..." -ForegroundColor Yellow
        if (-not (Test-Path .env.production)) {
            $apiUrl = Read-Host "Enter backend API URL (e.g., http://localhost:3001/api)"
            "VITE_API_URL=$apiUrl" | Out-File -FilePath .env.production -Encoding UTF8
        }
        npm ci
        npm run build
        
        Write-Host ""
        Write-Host "✅ Build complete!" -ForegroundColor Green
        Write-Host "  - Backend: ./backend/dist"
        Write-Host "  - Queue Worker: ./queue-worker/dist"
        Write-Host "  - Frontend: ./dist"
        Write-Host ""
        Write-Host "To start backend: cd backend && npm start"
        Write-Host "To serve frontend: npx serve -s dist -l 5173"
    }
    
    "3" {
        Write-Host ""
        Write-Host "🔨 Build Only" -ForegroundColor Cyan
        Write-Host "=============" -ForegroundColor Cyan
        
        # Backend
        Write-Host "Building Backend..." -ForegroundColor Yellow
        Set-Location backend
        npm ci
        npm run build
        Set-Location ..
        
        # Queue Worker
        Write-Host "Building Queue Worker..." -ForegroundColor Yellow
        Set-Location queue-worker
        npm ci
        npm run build
        Set-Location ..
        
        # Frontend
        Write-Host "Building Frontend..." -ForegroundColor Yellow
        if (-not (Test-Path .env.production)) {
            $apiUrl = Read-Host "Enter backend API URL (e.g., http://localhost:3001/api)"
            "VITE_API_URL=$apiUrl" | Out-File -FilePath .env.production -Encoding UTF8
        }
        npm ci
        npm run build
        
        Write-Host ""
        Write-Host "✅ Build complete!" -ForegroundColor Green
        Write-Host "  - Backend: ./backend/dist"
        Write-Host "  - Queue Worker: ./queue-worker/dist"
        Write-Host "  - Frontend: ./dist"
    }
    
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📚 For more details, see DEPLOYMENT.md" -ForegroundColor Cyan

