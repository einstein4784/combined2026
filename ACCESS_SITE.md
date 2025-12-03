# How to Access the Site

## Current Status
- ✅ Backend Server: Running on port 3001
- ✅ Frontend Server: Should be running (check PowerShell windows)

## Access Methods

### Method 1: Browser-Sync (Recommended)
If browser-sync started successfully, it should have opened automatically. If not:
1. Check the PowerShell window that ran `npx gulp`
2. Look for a message like: "Local: http://localhost:3000"
3. Open that URL in your browser

### Method 2: Direct File Access
If browser-sync isn't working, you can access files directly:
1. Navigate to: `C:\IandC\Drezoc_v2.0\Admin\dist\`
2. Open `pages-login.html` in your browser
3. Note: API calls will still work if backend is running on port 3001

### Method 3: Simple HTTP Server
If needed, you can use Python's HTTP server:
```powershell
cd C:\IandC\Drezoc_v2.0\Admin\dist
python -m http.server 8000
```
Then access: http://localhost:8000/pages-login.html

## Troubleshooting

### Backend Not Running?
```powershell
cd C:\IandC\Drezoc_v2.0\server
node server.js
```

### Frontend Not Running?
```powershell
cd C:\IandC\Drezoc_v2.0\Admin
npx gulp
```

### Check Ports
```powershell
netstat -ano | findstr ":3000 :3001"
```

## Default Login
- Username: `admin`
- Password: `admin123`


