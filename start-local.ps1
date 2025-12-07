# BioSynth Architect - Local Startup Script (Windows PowerShell)

Write-Host "🚀 Starting BioSynth Architect locally..." -ForegroundColor Green

# Check prerequisites
Write-Host "`nChecking prerequisites..." -ForegroundColor Yellow

$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "❌ Node.js not found. Please install Node.js 20+" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js found: $(node --version)" -ForegroundColor Green

$mysqlCheck = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysqlCheck) {
    Write-Host "⚠️  MySQL not found in PATH. Make sure MySQL is installed and running." -ForegroundColor Yellow
} else {
    Write-Host "✅ MySQL found" -ForegroundColor Green
}

$redisCheck = Get-Command redis-cli -ErrorAction SilentlyContinue
if (-not $redisCheck) {
    Write-Host "⚠️  Redis not found in PATH. Make sure Redis is installed and running." -ForegroundColor Yellow
} else {
    Write-Host "✅ Redis found" -ForegroundColor Green
}

# Check if .env files exist
Write-Host "`nChecking environment files..." -ForegroundColor Yellow

if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  backend\.env not found. Copying from env.example..." -ForegroundColor Yellow
    Copy-Item "backend\env.example" "backend\.env"
    Write-Host "📝 Please edit backend\.env and set your configuration!" -ForegroundColor Yellow
}

if (-not (Test-Path "queue-worker\.env")) {
    Write-Host "⚠️  queue-worker\.env not found. Copying from env.example..." -ForegroundColor Yellow
    Copy-Item "queue-worker\env.example" "queue-worker\.env"
    Write-Host "📝 Please edit queue-worker\.env and set your configuration!" -ForegroundColor Yellow
}

# Install dependencies if needed
Write-Host "`nChecking dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

if (-not (Test-Path "queue-worker\node_modules")) {
    Write-Host "Installing queue-worker dependencies..." -ForegroundColor Yellow
    Set-Location queue-worker
    npm install
    Set-Location ..
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "`n✅ All dependencies installed!" -ForegroundColor Green

# Start services
Write-Host "`nStarting services..." -ForegroundColor Yellow
Write-Host "You'll need to open 3 separate terminal windows:" -ForegroundColor Cyan
Write-Host "  1. Backend (Terminal 1)" -ForegroundColor Cyan
Write-Host "  2. Queue Worker (Terminal 2)" -ForegroundColor Cyan
Write-Host "  3. Frontend (Terminal 3)" -ForegroundColor Cyan
Write-Host "`nCommands to run:" -ForegroundColor Cyan
Write-Host "  Terminal 1: cd backend; npm run dev" -ForegroundColor White
Write-Host "  Terminal 2: cd queue-worker; npm run dev" -ForegroundColor White
Write-Host "  Terminal 3: npm run dev" -ForegroundColor White
Write-Host "`nOr use the commands below:" -ForegroundColor Cyan

Write-Host "`nPress any key to start services in new windows..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev"

# Wait a bit
Start-Sleep -Seconds 2

# Start queue worker in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\queue-worker'; npm run dev"

# Wait a bit
Start-Sleep -Seconds 2

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

Write-Host "`n✅ Services started in separate windows!" -ForegroundColor Green
Write-Host "`nAccess the application at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend API at: http://localhost:3001" -ForegroundColor Cyan

