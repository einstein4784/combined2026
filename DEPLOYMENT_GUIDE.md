# I&C Insurance Brokers - Server Deployment Guide

## Server Information
- **IP Address**: 161.35.229.126
- **Username**: root
- **Password**: TrinidaD!!!2026a
- **OS**: Ubuntu Server

## Prerequisites
- SSH access to the server
- Basic knowledge of Linux commands

## Step 1: Connect to Server

```bash
ssh root@161.35.229.126
# Enter password when prompted: TrinidaD!!!2026a
```

## Step 2: Upload Setup Script

From your local machine, upload the setup script:

```bash
# From Windows PowerShell or CMD
scp server-setup.sh root@161.35.229.126:/root/
```

Or manually copy the contents of `server-setup.sh` to the server.

## Step 3: Run Setup Script

On the server:

```bash
chmod +x server-setup.sh
./server-setup.sh
```

This will:
- Update system packages
- Install Node.js 18.x LTS
- Install PM2 process manager
- Install Nginx web server
- Install SQLite3
- Configure firewall (UFW)
- Set up fail2ban
- Create application directories
- Configure Nginx
- Set up PM2 ecosystem
- Install SSL certificate tools (Certbot)

## Step 4: Verify Installation

```bash
# Check Node.js version
node --version  # Should show v18.x.x

# Check npm version
npm --version

# Check PM2
pm2 --version

# Check Nginx
nginx -v

# Check SQLite
sqlite3 --version

# Check firewall status
ufw status
```

## Step 5: Application Directory Structure

After setup, the following structure will be created:

```
/var/www/iandc-insurance/
├── backend/          # Backend application files
├── frontend/         # Frontend static files
├── logs/            # Application logs
├── ecosystem.config.js  # PM2 configuration
└── deploy.sh        # Deployment script
```

## Step 6: Prepare for Deployment

The server is now ready. When you're ready to deploy:

1. **Upload Backend Files**:
   ```bash
   # From local machine
   scp -r server/* root@161.35.229.126:/var/www/iandc-insurance/backend/
   ```

2. **Upload Frontend Files**:
   ```bash
   # From local machine
   scp -r Admin/dist/* root@161.35.229.126:/var/www/iandc-insurance/frontend/
   ```

3. **Install Backend Dependencies**:
   ```bash
   cd /var/www/iandc-insurance/backend
   npm install --production
   ```

4. **Start Backend with PM2**:
   ```bash
   cd /var/www/iandc-insurance
   pm2 start ecosystem.config.js
   pm2 save
   ```

5. **Test Nginx Configuration**:
   ```bash
   nginx -t
   ```

6. **Reload Nginx**:
   ```bash
   systemctl reload nginx
   ```

## Step 7: Configure Domain (Optional)

If you have a domain name:

1. **Update Nginx Configuration**:
   ```bash
   nano /etc/nginx/sites-available/iandc-insurance
   ```
   Change `server_name _;` to `server_name yourdomain.com www.yourdomain.com;`

2. **Test Configuration**:
   ```bash
   nginx -t
   systemctl reload nginx
   ```

3. **Set up SSL Certificate**:
   ```bash
   certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

## Step 8: Firewall Configuration

The firewall is already configured, but verify:

```bash
# Check status
ufw status

# Allow additional ports if needed
ufw allow 3001/tcp  # Only if needed for direct access
```

## Useful Commands

### Check Application Status
```bash
/usr/local/bin/iandc-status.sh
```

### PM2 Commands
```bash
pm2 status              # Check status
pm2 logs iandc-backend  # View logs
pm2 restart iandc-backend  # Restart backend
pm2 stop iandc-backend     # Stop backend
pm2 monit                # Monitor resources
```

### Nginx Commands
```bash
systemctl status nginx   # Check status
systemctl restart nginx  # Restart
systemctl reload nginx   # Reload config
nginx -t                 # Test configuration
```

### View Logs
```bash
# Backend logs
tail -f /var/www/iandc-insurance/logs/backend-out.log
tail -f /var/www/iandc-insurance/logs/backend-error.log

# Nginx logs
tail -f /var/log/nginx/iandc-access.log
tail -f /var/log/nginx/iandc-error.log
```

## Security Checklist

- ✅ Firewall (UFW) configured
- ✅ Fail2ban installed and running
- ✅ SSH access secured
- ✅ Non-root user created (iandc)
- ✅ SSL ready (Certbot installed)
- ✅ Security headers in Nginx config

## Troubleshooting

### Backend not starting
```bash
cd /var/www/iandc-insurance/backend
node server.js  # Run directly to see errors
```

### Nginx not serving files
```bash
# Check permissions
ls -la /var/www/iandc-insurance/frontend

# Check Nginx error log
tail -f /var/log/nginx/iandc-error.log
```

### Port already in use
```bash
# Check what's using port 3001
netstat -tulpn | grep 3001

# Kill process if needed
kill -9 <PID>
```

## Next Steps After Deployment

1. Test the application at `http://161.35.229.126`
2. Set up domain name and SSL certificate
3. Configure backup strategy for database
4. Set up monitoring and alerts
5. Document any custom configurations

## Support

For issues or questions, contact:
- Nicholas Dass
- Solace-Systems
- nicholas@solace-systems.com
- 8684603788

