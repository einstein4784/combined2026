# Quick Server Setup Guide

## Server Details
- **IP**: 161.35.229.126
- **User**: root
- **Password**: TrinidaD!!!2026a

## Quick Setup Steps

### Step 1: Connect to Server

**Windows (PowerShell/CMD):**
```bash
ssh root@161.35.229.126
# Enter password: TrinidaD!!!2026a
```

**Windows (PuTTY):**
- Host: 161.35.229.126
- Port: 22
- Username: root
- Password: TrinidaD!!!2026a

### Step 2: Upload Setup Script

**Option A: Using SCP (Windows 10+):**
```bash
scp -o StrictHostKeyChecking=no server-setup.sh root@161.35.229.126:/root/
```

**Option B: Using WinSCP/FileZilla:**
1. Connect to server
2. Upload `server-setup.sh` to `/root/` directory

**Option C: Manual Copy:**
1. Open `server-setup.sh` on your local machine
2. Copy all contents
3. SSH to server
4. Create file: `nano server-setup.sh`
5. Paste contents and save (Ctrl+X, Y, Enter)

### Step 3: Run Setup Script

Once connected to the server:

```bash
# Make script executable
chmod +x server-setup.sh

# Run the setup script
./server-setup.sh
```

The script will:
- ✅ Update all system packages
- ✅ Install Node.js 18.x LTS
- ✅ Install npm
- ✅ Install PM2 (process manager)
- ✅ Install Nginx (web server)
- ✅ Install SQLite3
- ✅ Configure firewall (UFW)
- ✅ Set up fail2ban (security)
- ✅ Create application directories
- ✅ Configure Nginx
- ✅ Set up PM2 ecosystem
- ✅ Install SSL tools (Certbot)

**Expected Duration**: 5-10 minutes

### Step 4: Verify Installation

After the script completes, verify everything is installed:

```bash
# Check Node.js
node --version
# Should show: v18.x.x

# Check npm
npm --version

# Check PM2
pm2 --version

# Check Nginx
nginx -v

# Check SQLite
sqlite3 --version

# Check firewall
ufw status
```

### Step 5: Server is Ready!

The server is now prepared with:
- ✅ All required software installed
- ✅ Application directory created: `/var/www/iandc-insurance`
- ✅ Nginx configured (not activated yet)
- ✅ PM2 configured
- ✅ Firewall secured
- ✅ Security tools installed

## What's Next?

When you're ready to deploy the application:

1. **Upload Backend**:
   ```bash
   scp -r server/* root@161.35.229.126:/var/www/iandc-insurance/backend/
   ```

2. **Upload Frontend**:
   ```bash
   scp -r Admin/dist/* root@161.35.229.126:/var/www/iandc-insurance/frontend/
   ```

3. **Install Dependencies**:
   ```bash
   ssh root@161.35.229.126
   cd /var/www/iandc-insurance/backend
   npm install --production
   ```

4. **Start Application**:
   ```bash
   cd /var/www/iandc-insurance
   pm2 start ecosystem.config.js
   pm2 save
   ```

5. **Activate Nginx**:
   ```bash
   nginx -t
   systemctl reload nginx
   ```

## Directory Structure

After setup:
```
/var/www/iandc-insurance/
├── backend/          # Backend files go here
├── frontend/         # Frontend files go here
├── logs/            # Application logs
├── ecosystem.config.js
└── deploy.sh
```

## Useful Commands

```bash
# Check status
/usr/local/bin/iandc-status.sh

# PM2 commands
pm2 status
pm2 logs iandc-backend
pm2 restart iandc-backend

# Nginx commands
nginx -t
systemctl reload nginx
systemctl status nginx
```

## Troubleshooting

If something goes wrong:

1. **Check logs**:
   ```bash
   tail -f /var/log/nginx/iandc-error.log
   ```

2. **Check PM2 logs**:
   ```bash
   pm2 logs iandc-backend
   ```

3. **Restart services**:
   ```bash
   systemctl restart nginx
   pm2 restart iandc-backend
   ```

