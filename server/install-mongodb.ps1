# MongoDB Installation Script for Windows
Write-Host "MongoDB Setup for I&C Insurance System" -ForegroundColor Green
Write-Host ""

# Check if MongoDB is already installed
$mongoInstalled = Get-Command mongod -ErrorAction SilentlyContinue

if ($mongoInstalled) {
    Write-Host "MongoDB appears to be installed!" -ForegroundColor Yellow
    Write-Host "Checking if MongoDB service is running..." -ForegroundColor Yellow
    
    $service = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq 'Running') {
            Write-Host "MongoDB service is running!" -ForegroundColor Green
        } else {
            Write-Host "Starting MongoDB service..." -ForegroundColor Yellow
            Start-Service -Name "MongoDB"
        }
    } else {
        Write-Host "MongoDB service not found. You may need to start MongoDB manually." -ForegroundColor Yellow
        Write-Host "Run: mongod --dbpath C:\data\db" -ForegroundColor Cyan
    }
} else {
    Write-Host "MongoDB is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install MongoDB:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
    Write-Host "2. Run the installer" -ForegroundColor Cyan
    Write-Host "3. Choose 'Complete' installation" -ForegroundColor Cyan
    Write-Host "4. Install as Windows Service (recommended)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use Docker:" -ForegroundColor Yellow
    Write-Host "docker run -d -p 27017:27017 --name mongodb mongo:latest" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "After MongoDB is installed and running, start the backend server:" -ForegroundColor Yellow
Write-Host "cd server" -ForegroundColor Cyan
Write-Host "npm install" -ForegroundColor Cyan
Write-Host "node server.js" -ForegroundColor Cyan




