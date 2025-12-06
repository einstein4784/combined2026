#!/bin/bash

echo "=== Application Login Issue Diagnostics ==="
echo ""

echo "1. Checking if Node.js server is running..."
pm2 list
echo ""

echo "2. Checking Node.js application logs (last 50 lines)..."
pm2 logs --lines 50 --nostream 2>/dev/null || echo "PM2 not found or no logs"
echo ""

echo "3. Checking if server process is running..."
ps aux | grep -E "node|server.js" | grep -v grep
echo ""

echo "4. Checking application directory..."
if [ -d "/var/www" ]; then
    echo "Application in /var/www:"
    ls -la /var/www/
elif [ -d "/home" ]; then
    echo "Checking /home:"
    ls -la /home/
else
    echo "Current directory:"
    pwd
    ls -la
fi
echo ""

echo "5. Checking web server error logs..."
if [ -f "/var/log/nginx/error.log" ]; then
    echo "Nginx errors (last 30 lines):"
    tail -30 /var/log/nginx/error.log
elif [ -f "/var/log/apache2/error.log" ]; then
    echo "Apache errors (last 30 lines):"
    tail -30 /var/log/apache2/error.log
fi
echo ""

echo "6. Checking if port 3000 (or app port) is listening..."
netstat -tlnp | grep -E ":3000|:8080|:5000" || ss -tlnp | grep -E ":3000|:8080|:5000"
echo ""

echo "7. Checking database connection (if applicable)..."
# This will vary based on your setup
echo ""

echo "8. Checking application configuration..."
if [ -f "/var/www/server/server.js" ]; then
    echo "Server file found at /var/www/server/server.js"
elif [ -f "./server/server.js" ]; then
    echo "Server file found at ./server/server.js"
fi
echo ""

echo "9. Checking recent system logs for errors..."
journalctl -n 50 --no-pager 2>/dev/null || dmesg | tail -20
echo ""

echo "=== Diagnostic Complete ==="



