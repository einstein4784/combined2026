#!/bin/bash

# I&C Insurance Brokers - Server Setup Script
# This script prepares an Ubuntu server for deployment

set -e  # Exit on error

echo "=========================================="
echo "I&C Insurance Brokers - Server Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root"
    exit 1
fi

print_status "Starting server preparation..."

# Update system packages
print_status "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# Install essential packages
print_status "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    htop \
    nano \
    unzip \
    sqlite3

# Install Node.js 18.x LTS
print_status "Installing Node.js 18.x LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    print_status "Node.js $(node --version) installed"
    print_status "npm $(npm --version) installed"
else
    print_status "Node.js already installed: $(node --version)"
fi

# Install PM2 globally for process management
print_status "Installing PM2 process manager..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    print_status "PM2 installed successfully"
else
    print_status "PM2 already installed"
fi

# Install nginx for reverse proxy and static file serving
print_status "Installing Nginx web server..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl enable nginx
    print_status "Nginx installed successfully"
else
    print_status "Nginx already installed"
fi

# Configure firewall
print_status "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
print_status "Firewall configured"

# Configure fail2ban
print_status "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban
print_status "fail2ban configured"

# Create application directory structure
print_status "Creating application directory structure..."
APP_DIR="/var/www/iandc-insurance"
mkdir -p "$APP_DIR"/{backend,frontend,logs}
chown -R www-data:www-data "$APP_DIR"
print_status "Application directories created at $APP_DIR"

# Create system user for the application (optional but recommended)
print_status "Creating application user..."
if ! id -u iandc &>/dev/null; then
    useradd -r -s /bin/false -d "$APP_DIR" iandc
    chown -R iandc:iandc "$APP_DIR"
    print_status "Application user 'iandc' created"
else
    print_status "Application user 'iandc' already exists"
fi

# Set up log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/iandc-insurance << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 iandc iandc
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
print_status "Log rotation configured"

# Configure Nginx (basic configuration)
print_status "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/iandc-insurance << 'NGINX_CONFIG'
# I&C Insurance Brokers - Nginx Configuration
# This is a template - will be updated during deployment

upstream backend {
    server localhost:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name _;  # Replace with your domain name
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend static files
    location / {
        root /var/www/iandc-insurance/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Logging
    access_log /var/log/nginx/iandc-access.log;
    error_log /var/log/nginx/iandc-error.log;
}
NGINX_CONFIG

# Enable the site (but don't reload nginx yet)
ln -sf /etc/nginx/sites-available/iandc-insurance /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
print_status "Nginx configuration created (not activated yet)"

# Create PM2 ecosystem file template
print_status "Creating PM2 ecosystem configuration..."
cat > "$APP_DIR/ecosystem.config.js" << 'PM2_CONFIG'
// PM2 Ecosystem Configuration for I&C Insurance Brokers
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
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        autorestart: true,
        max_memory_restart: '500M',
        watch: false
    }]
};
PM2_CONFIG
chown iandc:iandc "$APP_DIR/ecosystem.config.js"
print_status "PM2 configuration created"

# Set up PM2 startup script
print_status "Setting up PM2 startup script..."
pm2 startup systemd -u iandc --hp /var/www/iandc-insurance
print_status "PM2 startup script configured"

# Create deployment script template
print_status "Creating deployment helper script..."
cat > "$APP_DIR/deploy.sh" << 'DEPLOY_SCRIPT'
#!/bin/bash
# Deployment script for I&C Insurance Brokers
# This script will be used to deploy updates

set -e

APP_DIR="/var/www/iandc-insurance"
cd "$APP_DIR"

echo "Starting deployment..."

# Stop the application
pm2 stop iandc-backend || true

# Backup database (if exists)
if [ -f "$APP_DIR/backend/database.sqlite" ]; then
    cp "$APP_DIR/backend/database.sqlite" "$APP_DIR/backend/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Install backend dependencies
cd "$APP_DIR/backend"
npm install --production

# Start the application
pm2 start ecosystem.config.js
pm2 save

# Reload nginx
nginx -t && systemctl reload nginx

echo "Deployment complete!"
DEPLOY_SCRIPT
chmod +x "$APP_DIR/deploy.sh"
chown iandc:iandc "$APP_DIR/deploy.sh"
print_status "Deployment script created"

# Set proper permissions
print_status "Setting permissions..."
chown -R iandc:iandc "$APP_DIR"
chmod -R 755 "$APP_DIR"
print_status "Permissions set"

# Install SSL certificate tools (Let's Encrypt)
print_status "Installing Certbot for SSL certificates..."
apt-get install -y certbot python3-certbot-nginx
print_status "Certbot installed (ready for SSL setup)"

# Create systemd service for monitoring (optional)
print_status "Creating system monitoring script..."
cat > /usr/local/bin/iandc-status.sh << 'STATUS_SCRIPT'
#!/bin/bash
# Status check script for I&C Insurance Brokers

echo "=== I&C Insurance Brokers Status ==="
echo ""
echo "Backend Status:"
pm2 status iandc-backend
echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager -l
echo ""
echo "Disk Usage:"
df -h /var/www/iandc-insurance
echo ""
echo "Memory Usage:"
free -h
STATUS_SCRIPT
chmod +x /usr/local/bin/iandc-status.sh
print_status "Status script created"

# Summary
echo ""
echo "=========================================="
print_status "Server preparation complete!"
echo "=========================================="
echo ""
echo "Installed components:"
echo "  ✓ System updates"
echo "  ✓ Node.js $(node --version)"
echo "  ✓ npm $(npm --version)"
echo "  ✓ PM2 process manager"
echo "  ✓ Nginx web server"
echo "  ✓ SQLite3 database"
echo "  ✓ UFW firewall"
echo "  ✓ Fail2ban security"
echo "  ✓ Certbot (SSL)"
echo ""
echo "Application directory: $APP_DIR"
echo ""
echo "Next steps:"
echo "  1. Upload application files to $APP_DIR"
echo "  2. Install backend dependencies: cd $APP_DIR/backend && npm install"
echo "  3. Build frontend: cd $APP_DIR/frontend && npm install && npm run build"
echo "  4. Start backend: pm2 start $APP_DIR/ecosystem.config.js"
echo "  5. Test nginx config: nginx -t"
echo "  6. Reload nginx: systemctl reload nginx"
echo ""
echo "To check status: /usr/local/bin/iandc-status.sh"
echo ""

