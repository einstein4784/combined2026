# Quick Start Guide - I&C Insurance System

## Prerequisites

1. **Node.js** (v14 or higher) - Already installed ✓
2. **MongoDB** - Needs to be installed

## Step 1: Install MongoDB

### Option A: Download MongoDB (Recommended)
1. Go to: https://www.mongodb.com/try/download/community
2. Download MongoDB Community Server for Windows
3. Run installer
4. Choose "Complete" installation
5. **Important**: Check "Install MongoDB as a Service"
6. Click "Install"

### Option B: Use Docker
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Verify MongoDB is Running
Open PowerShell:
```powershell
mongosh
```
If you see MongoDB shell, it's working! Type `exit` to leave.

## Step 2: Install Dependencies

### Backend
```powershell
cd C:\IandC\Drezoc_v2.0\server
npm install
```

### Frontend
```powershell
cd C:\IandC\Drezoc_v2.0\Admin
npm install
```

## Step 3: Start the Application

### Terminal 1 - Backend Server
```powershell
cd C:\IandC\Drezoc_v2.0\server
node server.js
```

You should see:
```
Connected to MongoDB
Server running on http://localhost:3001
Default admin user created: username=admin, password=admin123
```

### Terminal 2 - Frontend Server
```powershell
cd C:\IandC\Drezoc_v2.0\Admin
npx gulp
```

Browser should open automatically to `http://localhost:3000`

## Step 4: Login

- **URL**: http://localhost:3000 (or check the gulp output)
- **Username**: `admin`
- **Password**: `admin123`

## Troubleshooting

### MongoDB Not Running
- Check Windows Services: `services.msc` → Look for "MongoDB"
- Or start manually: `mongod --dbpath C:\data\db`

### Port Already in Use
- Backend (3001): Another Node process is using it
- Frontend (3000): Another process is using it
- MongoDB (27017): Another MongoDB instance is running

### Cannot Connect to MongoDB
- Make sure MongoDB service is running
- Check firewall settings
- Verify MongoDB is listening on port 27017

## Features Fixed

✅ **Save Customer Button** - Now works with proper error handling
✅ **ID Upload** - Made optional (not mandatory)
✅ **Delete Customer** - Fixed and working
✅ **MongoDB Database** - Robust database system
✅ **All CRUD Operations** - Working with MongoDB

## Database Collections

- `users` - System users
- `customers` - Customer records
- `policies` - Insurance policies
- `payments` - Payment records
- `receipts` - Receipt records

All data is stored in MongoDB database: `ic_insurance`

