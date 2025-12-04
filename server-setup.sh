#!/bin/bash

# ============================================
# I&C Insurance Brokers - Server Setup Script
# For Ubuntu 22.04/24.04 LTS
# ============================================

set -e

echo "============================================"
echo "I&C Insurance Brokers - Server Setup"
echo "============================================"

# Update system
echo ""
echo "[1/10] Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
echo ""
echo "[2/10] Installing essential packages..."
apt install -y curl wget git nginx ufw certbot python3-certbot-nginx

# Install Node.js 20.x LTS
echo ""
echo "[3/10] Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install PM2 for process management
echo ""
echo "[4/10] Installing PM2..."
npm install -g pm2

# Create app directory
echo ""
echo "[5/10] Setting up application directory..."
mkdir -p /var/www
cd /var/www

# Clone the repository
echo ""
echo "[6/10] Cloning repository from GitHub..."
if [ -d "iandc" ]; then
    echo "Directory exists, pulling latest changes..."
    cd iandc
    git pull origin main
else
    git clone https://github.com/einstein4784/iandc.git
    cd iandc
fi

# Install backend dependencies
echo ""
echo "[7/10] Installing backend dependencies..."
cd /var/www/iandc/server
npm install

# Build frontend
echo ""
echo "[8/10] Building frontend..."
cd /var/www/iandc/Admin
npm install
npx gulp build

# Create PM2 ecosystem file
echo ""
echo "[9/10] Configuring PM2..."
cat > /var/www/iandc/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'iandc-backend',
      script: 'server.js',
      cwd: '/var/www/iandc/server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
EOF

# Start backend with PM2
cd /var/www/iandc
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure Nginx
echo ""
echo "[10/10] Configuring Nginx..."
cat > /etc/nginx/sites-available/iandc << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend - Static files
    location / {
        root /var/www/iandc/Admin/dist;
        index pages-login.html index.html;
        try_files $uri $uri/ /pages-login.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/iandc /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# Configure firewall
echo ""
echo "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Create update script
echo ""
echo "Creating update script..."
cat > /var/www/iandc/update.sh << 'EOF'
#!/bin/bash
cd /var/www/iandc
git pull origin main
cd server && npm install
cd ../Admin && npm install && npx gulp build
pm2 restart iandc-backend
echo "Update complete!"
EOF
chmod +x /var/www/iandc/update.sh

# Create cron job for auto-updates (every hour)
echo ""
echo "Setting up auto-updates..."
(crontab -l 2>/dev/null; echo "0 * * * * /var/www/iandc/update.sh >> /var/log/iandc-update.log 2>&1") | crontab -

echo ""
echo "============================================"
echo "SETUP COMPLETE!"
echo "============================================"
echo ""
echo "Access your application at:"
echo "  http://68.183.63.56"
echo ""
echo "Default login:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart app"
echo "  /var/www/iandc/update.sh - Manual update from Git"
echo ""
echo "Auto-updates: Enabled (runs every hour)"
echo "============================================"

