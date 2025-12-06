#!/bin/bash

echo "=== Fixing Login Issue on Production Server ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if Node.js server is running
echo "1. Checking if Node.js server is running..."
if pgrep -f "node.*server.js" > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}"
    pm2 list
else
    echo -e "${RED}✗ Server is NOT running${NC}"
    echo "Attempting to start server..."
    
    # Try to find and start the server
    if [ -f "/var/www/server/server.js" ]; then
        cd /var/www
        pm2 start server/server.js --name "insurance-app" || node server/server.js &
    elif [ -f "./server/server.js" ]; then
        pm2 start server/server.js --name "insurance-app" || node server/server.js &
    else
        echo "Cannot find server.js. Please navigate to the application directory."
    fi
fi
echo ""

# 2. Check if port 3001 is listening
echo "2. Checking if port 3001 is listening..."
if netstat -tlnp 2>/dev/null | grep -q ":3001" || ss -tlnp 2>/dev/null | grep -q ":3001"; then
    echo -e "${GREEN}✓ Port 3001 is listening${NC}"
else
    echo -e "${RED}✗ Port 3001 is NOT listening${NC}"
    echo "Server may not be running or configured on a different port."
fi
echo ""

# 3. Check database
echo "3. Checking database..."
if [ -f "/var/www/server/database.js" ] || [ -f "./server/database.js" ]; then
    echo "Database file found"
    # Try to check if database is accessible
    if [ -f "insurance.db" ] || [ -f "/var/www/insurance.db" ] || [ -f "./insurance.db" ]; then
        echo -e "${GREEN}✓ Database file exists${NC}"
    else
        echo -e "${YELLOW}⚠ Database file not found in expected location${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Cannot locate database file${NC}"
fi
echo ""

# 4. Check if admin user exists
echo "4. Checking admin user..."
# This would require running a Node.js script to check the database
echo "To check admin user, run: node -e \"const db=require('./server/database'); db.db.get('SELECT * FROM users WHERE username=?',['admin'],(e,u)=>{if(u)console.log('Admin exists');else console.log('Admin missing');process.exit()});\""
echo ""

# 5. Check application logs
echo "5. Recent application logs:"
if command -v pm2 &> /dev/null; then
    pm2 logs --lines 20 --nostream 2>/dev/null || echo "No PM2 logs available"
else
    echo "PM2 not available"
fi
echo ""

# 6. Check web server configuration
echo "6. Checking web server configuration..."
if [ -f "/etc/nginx/sites-available/default" ] || [ -f "/etc/nginx/conf.d/default.conf" ]; then
    echo "Nginx configuration found"
    echo "Checking if API proxy is configured..."
    grep -i "3001\|/api" /etc/nginx/sites-available/default /etc/nginx/conf.d/*.conf 2>/dev/null | head -5
elif [ -f "/etc/apache2/sites-available/000-default.conf" ]; then
    echo "Apache configuration found"
else
    echo "No web server configuration found"
fi
echo ""

# 7. Check API configuration in frontend
echo "7. Checking frontend API configuration..."
if [ -f "/var/www/Admin/dist/assets/js/api.js" ]; then
    echo "Checking API_BASE_URL in frontend..."
    grep "API_BASE_URL" /var/www/Admin/dist/assets/js/api.js | head -1
    echo ""
    echo -e "${YELLOW}⚠ If API_BASE_URL is 'localhost:3001', it needs to be changed to the server IP${NC}"
elif [ -f "./Admin/dist/assets/js/api.js" ]; then
    echo "Checking API_BASE_URL in frontend..."
    grep "API_BASE_URL" ./Admin/dist/assets/js/api.js | head -1
    echo ""
    echo -e "${YELLOW}⚠ If API_BASE_URL is 'localhost:3001', it needs to be changed to the server IP${NC}"
else
    echo "Frontend files not found in expected location"
fi
echo ""

# 8. Network connectivity test
echo "8. Testing API endpoint..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/me 2>/dev/null | grep -q "401\|200"; then
    echo -e "${GREEN}✓ API endpoint is responding${NC}"
else
    echo -e "${RED}✗ API endpoint is NOT responding${NC}"
fi
echo ""

echo "=== Diagnostic Complete ==="
echo ""
echo "Common fixes:"
echo "1. Update API_BASE_URL in Admin/dist/assets/js/api.js to use server IP"
echo "2. Ensure server is running: pm2 start server/server.js"
echo "3. Check database has admin user"
echo "4. Verify CORS settings allow requests from your domain"



