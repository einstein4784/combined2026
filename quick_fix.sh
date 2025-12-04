#!/bin/bash
# Quick fix script - run this on the server after SSH

SERVER_IP="138.197.37.254"
API_PORT="3001"

echo "=== Quick Login Fix ==="

# Update API file
find /var/www /home -name "api.js" -path "*/dist/assets/js/api.js" 2>/dev/null | while read file; do
    if [ -f "$file" ]; then
        echo "Updating: $file"
        sed -i "s|http://localhost:3001/api|http://${SERVER_IP}:${API_PORT}/api|g" "$file"
        sed -i "s|const API_BASE_URL = '.*'|const API_BASE_URL = 'http://${SERVER_IP}:${API_PORT}/api'|g" "$file"
        echo "✓ Done"
    fi
done

# Start server if not running
if ! pgrep -f "node.*server.js" > /dev/null; then
    echo "Starting server..."
    [ -f "/var/www/server/server.js" ] && cd /var/www && (pm2 start server/server.js --name "insurance-app" 2>/dev/null || nohup node server/server.js > server.log 2>&1 &)
fi

# Create admin user
[ -f "/var/www/server/create-admin.js" ] && cd /var/www && node server/create-admin.js 2>/dev/null

echo "✓ Fix complete! Clear browser cache and try again."

