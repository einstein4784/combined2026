#!/bin/bash
# I&C Insurance Brokers - One-Command Server Setup
# Copy and paste this entire script into your SSH session

set -e

echo "=========================================="
echo "I&C Insurance Brokers - Server Setup"
echo "=========================================="
echo ""

# Update system
echo "[1/12] Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y

# Install essentials
echo "[2/12] Installing essential packages..."
apt-get install -y curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release ufw fail2ban htop nano unzip sqlite3

# Install Node.js 18.x
echo "[3/12] Installing Node.js 18.x LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js $(node --version) installed"

# Install PM2
echo "[4/12] Installing PM2..."
npm install -g pm2

# Install Nginx
echo "[5/12] Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx

# Configure firewall
echo "[6/12] Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configure fail2ban
echo "[7/12] Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Create directories
echo "[8/12] Creating application directories..."
APP_DIR="/var/www/iandc-insurance"
mkdir -p "$APP_DIR"/{backend,frontend,logs}
useradd -r -s /bin/false -d "$APP_DIR" iandc 2>/dev/null || true
chown -R iandc:iandc "$APP_DIR"

# Create Nginx config
echo "[9/12] Creating Nginx configuration..."
cat > /etc/nginx/sites-available/iandc-insurance << 'EOF'
upstream backend {
    server localhost:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name _;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        root /var/www/iandc-insurance/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    access_log /var/log/nginx/iandc-access.log;
    error_log /var/log/nginx/iandc-error.log;
}
EOF

ln -sf /etc/nginx/sites-available/iandc-insurance /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Create PM2 config
echo "[10/12] Creating PM2 configuration..."
cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
    apps: [{
        name: 'iandc-backend',
        script: './backend/server.js',
        cwd: '/var/www/iandc-insurance',
        instances: 1,
        exec_mode: 'fork',
        env: {
            NODE_ENV: 'production',
            PORT: 3001
        },
        error_file: './logs/backend-error.log',
        out_file: './logs/backend-out.log',
        autorestart: true,
        max_memory_restart: '500M'
    }]
};
EOF

# Install Certbot
echo "[11/12] Installing SSL tools..."
apt-get install -y certbot python3-certbot-nginx

# Set permissions
echo "[12/12] Setting permissions..."
chown -R iandc:iandc "$APP_DIR"
chmod -R 755 "$APP_DIR"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Installed:"
echo "  ✓ Node.js $(node --version)"
echo "  ✓ npm $(npm --version)"
echo "  ✓ PM2 $(pm2 --version)"
echo "  ✓ Nginx"
echo "  ✓ SQLite3"
echo ""
echo "Application directory: $APP_DIR"
echo ""
echo "Next: Upload your application files and run:"
echo "  cd $APP_DIR/backend && npm install"
echo "  pm2 start $APP_DIR/ecosystem.config.js"
echo "  nginx -t && systemctl reload nginx"
echo ""

