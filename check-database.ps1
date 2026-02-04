# Check Database Connection Script
Write-Host "=== Database Connection Check ===" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL service exists
$pgService = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    Write-Host "PostgreSQL service found: $($pgService.Name)" -ForegroundColor Green
    Write-Host "  Status: $($pgService.Status)" -ForegroundColor $(if ($pgService.Status -eq 'Running') { 'Green' } else { 'Yellow' })
    if ($pgService.Status -ne 'Running') {
        Write-Host "  Service is not running. Start it with: Start-Service '$($pgService.Name)'" -ForegroundColor Yellow
    }
} else {
    Write-Host "PostgreSQL service not found" -ForegroundColor Red
}

Write-Host ""

# Check if port 5432 is open
Write-Host "Checking port 5432..." -ForegroundColor Cyan
$portOpen = Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($portOpen) {
    Write-Host "Port 5432 is open (PostgreSQL might be running)" -ForegroundColor Green
} else {
    Write-Host "Port 5432 is not accessible" -ForegroundColor Red
    Write-Host "  PostgreSQL is not running or not installed" -ForegroundColor Yellow
}

Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Cyan
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker is installed: $dockerVersion" -ForegroundColor Green
        Write-Host "  Start PostgreSQL with: docker compose up -d db" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Docker is not installed" -ForegroundColor Red
    Write-Host "  Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To fix database connection:" -ForegroundColor Yellow
Write-Host "1. Install Docker Desktop" -ForegroundColor White
Write-Host "2. Run: docker compose up -d db" -ForegroundColor White
Write-Host "3. Wait 5 seconds, then try logging in again" -ForegroundColor White
Write-Host ""
