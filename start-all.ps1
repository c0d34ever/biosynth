# Start all services in separate windows
# Run this from project root

$projectPath = $PSScriptRoot
if (-not $projectPath) {
    $projectPath = Get-Location
}

Write-Host "🚀 Starting BioSynth Architect Services..." -ForegroundColor Green
Write-Host "Project path: $projectPath`n" -ForegroundColor Gray

# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath\backend'; Write-Host 'Backend Service' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

# Start Queue Worker
Write-Host "Starting Queue Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath\queue-worker'; Write-Host 'Queue Worker Service' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'Frontend Service' -ForegroundColor Cyan; npm run dev"

Write-Host "`n✅ All services started in separate windows!" -ForegroundColor Green
Write-Host "`nAccess the application at:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

