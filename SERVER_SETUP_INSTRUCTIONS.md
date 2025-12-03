# Server Setup Instructions

## Server Information
- **IP Address**: 161.35.229.126
- **Username**: root
- **Password**: TrinidaD!!!2026a
- **OS**: Ubuntu Server (Digital Ocean)

## Quick Start (Recommended)

### Method 1: Copy-Paste Script (Easiest)

1. **Connect to server**:
   ```bash
   ssh root@161.35.229.126
   # Password: TrinidaD!!!2026a
   ```

2. **Copy the entire contents of `run-on-server.sh`** and paste into your SSH session, then press Enter.

3. **Wait for completion** (5-10 minutes)

4. **Verify installation**:
   ```bash
   node --version
   npm --version
   pm2 --version
   nginx -v
   ```

### Method 2: Upload Script File

1. **Upload script** (from Windows PowerShell):
   ```powershell
   scp run-on-server.sh root@161.35.229.126:/root/
   ```

2. **Connect to server**:
   ```bash
   ssh root@161.35.229.126
   ```

3. **Run script**:
   ```bash
   chmod +x run-on-server.sh
   ./run-on-server.sh
   ```

### Method 3: Use Full Setup Script

1. **Upload `server-setup.sh`**:
   ```powershell
   scp server-setup.sh root@161.35.229.126:/root/
   ```

2. **Connect and run**:
   ```bash
   ssh root@161.35.229.126
   chmod +x server-setup.sh
   ./server-setup.sh
   ```

## What Gets Installed

The setup script installs and configures:

### Core Software
- ✅ **Node.js 18.x LTS** - JavaScript runtime
- ✅ **npm** - Node package manager
- ✅ **PM2** - Process manager for Node.js apps
- ✅ **Nginx** - Web server and reverse proxy
- ✅ **SQLite3** - Database engine

### Security
- ✅ **UFW Firewall** - Configured to allow SSH, HTTP (80), HTTPS (443)
- ✅ **Fail2ban** - Intrusion prevention
- ✅ **Security headers** - Added to Nginx config

### System Tools
- ✅ **curl, wget, git** - Essential utilities
- ✅ **build-essential** - Compilation tools
- ✅ **Certbot** - SSL certificate management

### Application Structure
Creates `/var/www/iandc-insurance/` with:
- `backend/` - For backend application files
- `frontend/` - For frontend static files
- `logs/` - Application logs
- `ecosystem.config.js` - PM2 configuration

## Verification Steps

After setup completes, verify everything:

```bash
# Check Node.js
node --version
# Expected: v18.x.x

# Check npm
npm --version
# Expected: 9.x.x or 10.x.x

# Check PM2
pm2 --version
# Expected: 5.x.x

# Check Nginx
nginx -v
# Expected: nginx version 1.x.x

# Check SQLite
sqlite3 --version
# Expected: 3.x.x

# Check firewall
ufw status
# Should show: Status: active

# Check directories
ls -la /var/www/iandc-insurance/
# Should show: backend, frontend, logs directories
```

## Troubleshooting

### Connection Issues

**"Host key verification failed"**:
```bash
ssh-keygen -R 161.35.229.126
ssh root@161.35.229.126
```

**"Permission denied"**:
- Double-check password: `TrinidaD!!!2026a`
- Ensure you're using `root` user

### Script Issues

**Script won't run**:
```bash
chmod +x run-on-server.sh
bash run-on-server.sh
```

**Package installation fails**:
```bash
apt-get update
apt-get upgrade
# Then retry script
```

### Verification Fails

**Node.js not found**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
```

**PM2 not found**:
```bash
npm install -g pm2
```

## Next Steps (After Setup)

Once the server is prepared, you'll need to:

1. **Upload application files** (when ready)
2. **Install backend dependencies**: `cd /var/www/iandc-insurance/backend && npm install`
3. **Start backend**: `pm2 start /var/www/iandc-insurance/ecosystem.config.js`
4. **Activate Nginx**: `nginx -t && systemctl reload nginx`

## Security Notes

- ✅ Firewall is configured and active
- ✅ Only ports 22 (SSH), 80 (HTTP), 443 (HTTPS) are open
- ✅ Fail2ban is protecting against brute force attacks
- ✅ Application runs as non-root user (`iandc`)
- ✅ SSL certificate tools ready for HTTPS setup

## Support Files Created

- `server-setup.sh` - Full-featured setup script with logging
- `run-on-server.sh` - Simplified one-command script
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `QUICK_SETUP.md` - Quick reference guide

## Important Notes

⚠️ **Do NOT upload application files yet** - The server is only being prepared.

⚠️ **Nginx is configured but not activated** - Will be activated after deployment.

⚠️ **Backend will run on port 3001** - Nginx will proxy requests to it.

⚠️ **Database will be SQLite** - File located at `/var/www/iandc-insurance/backend/database.sqlite`

## Contact

For issues or questions:
- Nicholas Dass
- Solace-Systems
- nicholas@solace-systems.com
- 8684603788

