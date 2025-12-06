# Migration to MongoDB - Complete

## What Changed

### 1. Database Migration
- ✅ **Replaced SQLite with MongoDB**
- ✅ **All tables converted to MongoDB collections:
  - `users` → User collection
  - `customers` → Customer collection
  - `policies` → Policy collection
  - `payments` → Payment collection
  - `receipts` → Receipt collection

### 2. Fixed Save Customer Button
- ✅ Added better error handling
- ✅ Added loading state during save
- ✅ Better validation messages
- ✅ Proper form validation

### 3. Made ID Upload Optional
- ✅ Changed label to indicate ID scanning is optional
- ✅ ID upload is not mandatory for creating customer creation

## Setup Instructions

### Step 1: Install MongoDB

**Option A: Download and Install**
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Run installer
3. Choose "Complete" installation
4. Install as Windows Service

**Option B: Use Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 2: Verify MongoDB is Running

Open PowerShell and run:
```powershell
mongosh
```

If you see MongoDB shell prompt, it's working!

### Step 3: Install Dependencies

```bash
cd C:\IandC\Drezoc_v2.0\server
npm install
```

### Step 4: Start Backend Server

```bash
cd C:\IandC\Drezoc_v2.0\server
node server.js
```

You should see:
```
Connected to MongoDB
Server running on http://localhost:3001
Default admin user created: username=admin, password=admin123
```

## Database Details

- **Database Name**: `ic_insurance`
- **Connection**: `mongodb://localhost:27017/ic_insurance`
- **Collections**: users, customers, policies, payments, receipts

## Features

- ✅ All CRUD operations work with MongoDB
- ✅ Relationships maintained via ObjectId references
- ✅ Automatic admin user creation on first run
- ✅ Indexes for unique fields (username, email, id_number, etc.)
- ✅ Proper error handling

## Testing

1. Start MongoDB
2. Start backend server
3. Login with admin/admin123
4. Try creating a customer - should work now!




