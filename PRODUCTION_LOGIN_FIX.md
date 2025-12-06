# Production Login Fix Guide

## Problem
Unable to login to application on server 138.197.37.254

## Root Cause
The API is configured to use `localhost:3001` which doesn't work on the production server. The frontend needs to connect to the server's IP address.

## Solution

### Step 1: SSH into the Server

```bash
ssh root@138.197.37.254
# Password: TrinidaD!!!2026a
```

### Step 2: Run the Fix Script

Once connected, navigate to your application directory and run:

```bash
# Upload the fix script first, or create it on the server:
cat > fix_production_login.sh << 'EOF'
#!/bin/bash
SERVER_IP="138.197.37.254"
API_PORT="3001"

# Find and update API file
find /var/www /home -name "api.js" -path "*/dist/assets/js/api.js" 2>/dev/null | while read file; do
    if [ -f "$file" ]; then
        echo "Updating $file"
        cp "$file" "${file}.backup"
        sed -i "s|http://localhost:3001/api|http://${SERVER_IP}:${API_PORT}/api|g" "$file"
        echo "✓ Updated"
    fi
done

# Check if server is running
if ! pgrep -f "node.*server.js" > /dev/null; then
    echo "Starting server..."
    if [ -f "/var/www/server/server.js" ]; then
        cd /var/www && pm2 start server/server.js --name "insurance-app" || node server/server.js &
    fi
fi

# Check/Create admin user
if [ -f "/var/www/server/create-admin.js" ]; then
    cd /var/www && node server/create-admin.js
fi

echo "Fix complete! Clear browser cache and try logging in."
EOF

chmod +x fix_production_login.sh
bash fix_production_login.sh
```

### Step 3: Manual Fix (Alternative)

If the script doesn't work, manually update the API configuration:

1. **Find the API file:**
   ```bash
   find /var/www /home -name "api.js" -path "*/dist/assets/js/api.js"
   ```

2. **Edit the file and change:**
   ```javascript
   const API_BASE_URL = 'http://localhost:3001/api';
   ```
   **To:**
   ```javascript
   const API_BASE_URL = 'http://138.197.37.254:3001/api';
   ```

3. **Or use sed:**
   ```bash
   find /var/www /home -name "api.js" -path "*/dist/assets/js/api.js" -exec sed -i 's|http://localhost:3001/api|http://138.197.37.254:3001/api|g' {} \;
   ```

### Step 4: Ensure Server is Running

```bash
# Check if server is running
pm2 list
# or
ps aux | grep node

# If not running, start it:
cd /var/www  # or wherever your app is
pm2 start server/server.js --name "insurance-app"
# or
node server/server.js &
```

### Step 5: Check Admin User Exists

```bash
cd /var/www  # or your app directory
node server/create-admin.js
```

### Step 6: Verify API is Accessible

```bash
# Test from server
curl http://localhost:3001/api/me

# Should return: {"error":"Unauthorized"} or similar (not connection error)
```

### Step 7: Check Firewall

```bash
# Ubuntu/Debian
ufw allow 3001/tcp
ufw status

# CentOS/RHEL
firewall-cmd --add-port=3001/tcp --permanent
firewall-cmd --reload
```

## Quick Diagnostic Commands

Run these to diagnose the issue:

```bash
# 1. Check if server is running
pm2 list || ps aux | grep node

# 2. Check if port 3001 is listening
netstat -tlnp | grep 3001 || ss -tlnp | grep 3001

# 3. Check server logs
pm2 logs --lines 50

# 4. Test API endpoint
curl -v http://localhost:3001/api/me

# 5. Check database
ls -la *.db
```

## Updated API Configuration

I've updated the source code to auto-detect the server IP. After rebuilding and deploying, the API will automatically use the correct server address.

**To deploy the updated code:**

1. **On your local machine**, the code is already updated
2. **Upload to server** or pull from git
3. **Rebuild frontend** on server:
   ```bash
   cd /var/www/Admin
   npm install
   npx gulp build
   ```

## Default Login Credentials

- **Username:** `admin`
- **Password:** `admin123`

## After Fix

1. Clear browser cache (Ctrl+Shift+Delete)
2. Try logging in again
3. Check browser console (F12) for any errors
4. Verify the API URL in Network tab shows: `http://138.197.37.254:3001/api/login`



