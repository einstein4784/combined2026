$password = ConvertTo-SecureString "TrinidaD!!!2026a" -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential("root", $password)

# Try to connect and run diagnostic commands
$commands = @"
echo '=== Checking application status ==='
pm2 list
echo ''
echo '=== Checking Node.js application logs ==='
pm2 logs --lines 50 --nostream
echo ''
echo '=== Checking if server is running ==='
ps aux | grep node
echo ''
echo '=== Checking application directory ==='
ls -la /var/www/ 2>/dev/null || ls -la /home/ 2>/dev/null || pwd
echo ''
echo '=== Checking recent error logs ==='
tail -50 /var/log/nginx/error.log 2>/dev/null || echo 'Nginx log not found'
tail -50 /var/log/apache2/error.log 2>/dev/null || echo 'Apache log not found'
"@

# Note: This approach requires SSH key or manual password entry
# For automated password entry, we'd need plink or expect
Write-Host "To connect manually, run: ssh root@138.197.37.254"
Write-Host "Password: TrinidaD!!!2026a"
Write-Host ""
Write-Host "Or use plink: plink -ssh root@138.197.37.254 -pw TrinidaD!!!2026a"



