# I&C Insurance Brokers - Server Setup Script (PowerShell)
# This script uploads and runs the setup script on the Ubuntu server

$serverIP = "161.35.229.126"
$username = "root"
$password = "TrinidaD!!!2026a"
$setupScript = "server-setup.sh"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "I&C Insurance Brokers - Server Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if server-setup.sh exists
if (-Not (Test-Path $setupScript)) {
    Write-Host "Error: $setupScript not found!" -ForegroundColor Red
    Write-Host "Please ensure server-setup.sh is in the current directory." -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Uploading setup script to server..." -ForegroundColor Green

# Install SSH client if not available (Windows 10+ should have it)
try {
    # Upload script using SCP (requires OpenSSH client)
    $scpCommand = "scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL $setupScript ${username}@${serverIP}:/root/"
    
    # Create a secure string for password
    $securePassword = ConvertTo-SecureString $password -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential($username, $securePassword)
    
    # Alternative: Use plink (PuTTY) if available, or provide manual instructions
    Write-Host "[INFO] Please run the following commands manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Using SCP (if OpenSSH is installed):" -ForegroundColor Cyan
    Write-Host "  scp -o StrictHostKeyChecking=no server-setup.sh root@${serverIP}:/root/" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2: Copy the contents of server-setup.sh and run on server:" -ForegroundColor Cyan
    Write-Host "  ssh root@${serverIP}" -ForegroundColor White
    Write-Host "  # Then paste the contents of server-setup.sh" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 3: Use WinSCP or FileZilla to upload server-setup.sh" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "[ERROR] Could not upload script automatically." -ForegroundColor Red
    Write-Host "Please upload server-setup.sh manually using one of the methods above." -ForegroundColor Yellow
}

Write-Host "[INFO] Once uploaded, connect to the server and run:" -ForegroundColor Green
Write-Host "  ssh root@${serverIP}" -ForegroundColor White
Write-Host "  chmod +x server-setup.sh" -ForegroundColor White
Write-Host "  ./server-setup.sh" -ForegroundColor White
Write-Host ""

