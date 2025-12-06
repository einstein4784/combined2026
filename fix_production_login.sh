#!/bin/bash

# Production Login Fix Script
# Run this on the server: bash fix_production_login.sh

SERVER_IP="138.197.37.254"
API_PORT="3001"

echo "=== Production Login Fix Script ==="
echo "Server IP: $SERVER_IP"
echo ""

# 1. Update API configuration in built frontend
echo "1. Updating API configuration in frontend..."
FRONTEND_API_FILE=""

# Try to find the built API file
if [ -f "/var/www/Admin/dist/assets/js/api.js" ]; then
    FRONTEND_API_FILE="/var/www/Admin/dist/assets/js/api.js"
elif [ -f "./Admin/dist/assets/js/api.js" ]; then
    FRONTEND_API_FILE="./Admin/dist/assets/js/api.js"
elif [ -f "/home/Admin/dist/assets/js/api.js" ]; then
    FRONTEND_API_FILE="/home/Admin/dist/assets/js/api.js"
fi

if [ -n "$FRONTEND_API_FILE" ]; then
    echo "Found API file: $FRONTEND_API_FILE"
    # Backup original
    cp "$FRONTEND_API_FILE" "${FRONTEND_API_FILE}.backup"
    
    # Update API_BASE_URL to use server IP
    sed -i "s|http://localhost:3001/api|http://${SERVER_IP}:${API_PORT}/api|g" "$FRONTEND_API_FILE"
    sed -i "s|const API_BASE_URL = '.*'|const API_BASE_URL = 'http://${SERVER_IP}:${API_PORT}/api'|g" "$FRONTEND_API_FILE"
    
    echo "✓ Updated API_BASE_URL to http://${SERVER_IP}:${API_PORT}/api"
else
    echo "⚠ Frontend API file not found. You may need to rebuild the frontend."
    echo "  Run: cd Admin && npx gulp build"
fi
echo ""

# 2. Check if server is running
echo "2. Checking if Node.js server is running..."
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✓ Server process found"
    pm2 list 2>/dev/null || echo "  (PM2 not available, but process is running)"
else
    echo "✗ Server is NOT running"
    echo "  Attempting to start server..."
    
    # Try to find and start server
    if [ -f "/var/www/server/server.js" ]; then
        cd /var/www
        if command -v pm2 &> /dev/null; then
            pm2 start server/server.js --name "insurance-app" || echo "  Failed to start with PM2"
        else
            nohup node server/server.js > server.log 2>&1 &
            echo "  Started server in background (PID: $!)"
        fi
    elif [ -f "./server/server.js" ]; then
        if command -v pm2 &> /dev/null; then
            pm2 start server/server.js --name "insurance-app" || echo "  Failed to start with PM2"
        else
            nohup node server/server.js > server.log 2>&1 &
            echo "  Started server in background (PID: $!)"
        fi
    else
        echo "  ✗ Cannot find server.js"
        echo "  Please navigate to the application directory and start manually:"
        echo "    node server/server.js"
    fi
fi
echo ""

# 3. Check if port is listening
echo "3. Checking if port $API_PORT is listening..."
sleep 2  # Give server time to start
if netstat -tlnp 2>/dev/null | grep -q ":${API_PORT}" || ss -tlnp 2>/dev/null | grep -q ":${API_PORT}"; then
    echo "✓ Port $API_PORT is listening"
else
    echo "✗ Port $API_PORT is NOT listening"
    echo "  Server may need more time to start, or there's a configuration issue"
fi
echo ""

# 4. Check/Create admin user
echo "4. Checking admin user in database..."
if [ -f "/var/www/server/create-admin.js" ] || [ -f "./server/create-admin.js" ]; then
    ADMIN_SCRIPT=""
    if [ -f "/var/www/server/create-admin.js" ]; then
        ADMIN_SCRIPT="/var/www/server/create-admin.js"
        cd /var/www
    else
        ADMIN_SCRIPT="./server/create-admin.js"
    fi
    
    echo "  Running admin user creation script..."
    node "$ADMIN_SCRIPT" 2>&1
    echo "✓ Admin user check/creation completed"
else
    echo "⚠ Admin creation script not found"
    echo "  You may need to create admin user manually"
fi
echo ""

# 5. Test API endpoint
echo "5. Testing API endpoint..."
sleep 1
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/api/me" 2>/dev/null)
if [ "$API_RESPONSE" = "401" ] || [ "$API_RESPONSE" = "200" ]; then
    echo "✓ API endpoint is responding (HTTP $API_RESPONSE)"
else
    echo "✗ API endpoint returned HTTP $API_RESPONSE"
    echo "  This might indicate the server is not running or not accessible"
fi
echo ""

# 6. Check firewall
echo "6. Checking firewall rules..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "${API_PORT}"; then
        echo "✓ Port $API_PORT appears in firewall rules"
    else
        echo "⚠ Port $API_PORT may not be open in firewall"
        echo "  Consider running: ufw allow $API_PORT/tcp"
    fi
elif command -v firewall-cmd &> /dev/null; then
    if firewall-cmd --list-ports 2>/dev/null | grep -q "${API_PORT}"; then
        echo "✓ Port $API_PORT is open in firewall"
    else
        echo "⚠ Port $API_PORT may not be open"
        echo "  Consider running: firewall-cmd --add-port=${API_PORT}/tcp --permanent"
    fi
else
    echo "⚠ Cannot check firewall (ufw/firewall-cmd not found)"
fi
echo ""

# 7. Check CORS configuration
echo "7. Checking CORS configuration in server..."
if [ -f "/var/www/server/server.js" ] || [ -f "./server/server.js" ]; then
    SERVER_FILE=""
    if [ -f "/var/www/server/server.js" ]; then
        SERVER_FILE="/var/www/server/server.js"
    else
        SERVER_FILE="./server/server.js"
    fi
    
    if grep -q "callback(null, true)" "$SERVER_FILE"; then
        echo "✓ CORS appears to be configured to allow all origins"
    else
        echo "⚠ CORS may need configuration update"
    fi
fi
echo ""

echo "=== Fix Complete ==="
echo ""
echo "Next steps:"
echo "1. If API file was updated, clear browser cache and reload the login page"
echo "2. Try logging in with:"
echo "   Username: admin"
echo "   Password: admin123"
echo "3. Check browser console (F12) for any errors"
echo "4. Verify server is accessible: curl http://${SERVER_IP}:${API_PORT}/api/me"
echo ""



