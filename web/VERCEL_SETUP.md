# Vercel Deployment Setup Guide

## Database Configuration

The application uses MongoDB with the database name **CISLDB**.

### Connection String Format

Your `MONGODB_URI` should include the database name:
```
mongodb+srv://username:password@cluster.mongodb.net/CISLDB?retryWrites=true&w=majority
```

**Current connection string:**
```
mongodb+srv://Vercel-Admin-CISL2026NEW:cYRhWcHcNispLKYp@cisl2026new.izson30.mongodb.net/CISLDB?retryWrites=true&w=majority
```

## Fixing Vercel Environment Variable Error

If you see this error:
> "This project already has an existing environment variable with name MONGODB_URI in one of the chosen environments"

### Solution Options:

#### Option 1: Update Existing Variable (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Find the existing `MONGODB_URI` variable
4. Click **Edit** and update it with the new connection string (including `/CISLDB`)
5. Make sure it's set for all environments (Production, Preview, Development)
6. Redeploy your project

#### Option 2: Delete and Re-add
1. Go to **Settings** → **Environment Variables**
2. Delete the existing `MONGODB_URI` variable
3. Add it again with the new value (including `/CISLDB`)
4. Redeploy

#### Option 3: If Project is Already Linked
If your project is already linked to Vercel:
1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Update the `MONGODB_URI` value to include `/CISLDB`
5. Redeploy

## Required Environment Variables

Set these in Vercel **Settings** → **Environment Variables**:

### 1. Generate AUTH_SECRET

First, generate a secure AUTH_SECRET:

```bash
npm run generate-auth-secret
```

This will output a random secret. Copy it.

### 2. Set Environment Variables in Vercel

Go to **Settings** → **Environment Variables** and add:

**MONGODB_URI:**
```
mongodb+srv://Vercel-Admin-CISL2026NEW:cYRhWcHcNispLKYp@cisl2026new.izson30.mongodb.net/CISLDB?retryWrites=true&w=majority
```

**AUTH_SECRET:**
```
<paste the generated secret from step 1>
```

**DEFAULT_ADMIN_EMAIL:**
```
admin@icinsurance.com
```

**DEFAULT_ADMIN_PASSWORD:**
```
<your-secure-admin-password>
```

**Important**: 
- Make sure `MONGODB_URI` includes `/CISLDB` before the `?` in the connection string
- `AUTH_SECRET` is **REQUIRED** - without it, login will fail with a configuration error
- Set these for **all environments** (Production, Preview, Development)

## After Setting Environment Variables

1. **Redeploy** your project (or push a new commit)
2. The app will automatically connect to the `CISLDB` database
3. If you need to seed the admin user, you can run `npm run seed:admin` locally (it will connect to the same database)

## Verifying Database Connection

After deployment, check your Vercel function logs to ensure:
- Database connection is successful
- No connection errors appear
- The app is using the `CISLDB` database

