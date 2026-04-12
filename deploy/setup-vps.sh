#!/bin/bash
# ============================================================
#  Nexus — Complete VPS Setup Script
#  Paste this entire script into your VPS terminal.
#  Takes ~5 minutes. Your site will be live at the end.
# ============================================================
set -e

DOMAIN="nexus.ai"
DB_NAME="nexus"
DB_USER="nexus_user"
DB_PASS="@103BoscobelRoad"
APP_DIR="/var/www/nexus"
JWT_SECRET="7c3fcbecea5a517a4bd5c30301d66d38ffababe64091897f6eca38e7af76791d24966df23cedde5a858ee8326614c179c91b19c0f61c5a832bbd29d3ca50eeb2"
ENCRYPTION_KEY="83634307f0283f520062f09a3b947eea88a6018400d0dde81dfd8787e4b56173"

echo ""
echo "================================================"
echo "  Nexus VPS Setup — $(date)"
echo "================================================"

# ── 1. System update ─────────────────────────────────────────
echo "[1/10] Updating system..."
apt-get update -qq
apt-get upgrade -y -qq

# ── 2. Node.js 20 ────────────────────────────────────────────
echo "[2/10] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y nodejs > /dev/null 2>&1
echo "       Node: $(node --version)"

# ── 3. pnpm + PM2 ────────────────────────────────────────────
echo "[3/10] Installing pnpm and PM2..."
npm install -g pnpm@10 pm2 > /dev/null 2>&1
export COREPACK_ENABLE_STRICT=0
echo "       pnpm: $(pnpm --version)"

# ── 4. MySQL ─────────────────────────────────────────────────
echo "[4/10] Installing MySQL..."
apt-get install -y mysql-server > /dev/null 2>&1
systemctl start mysql
systemctl enable mysql > /dev/null 2>&1

echo "       Creating database and user..."
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
echo "       Database ready."

# ── 5. Nginx ─────────────────────────────────────────────────
echo "[5/10] Installing Nginx..."
apt-get install -y nginx > /dev/null 2>&1
systemctl enable nginx > /dev/null 2>&1

# ── 6. Clone repo ────────────────────────────────────────────
echo "[6/10] Cloning Nexus repository..."
mkdir -p $APP_DIR
cd $APP_DIR

if [ -d ".git" ]; then
    echo "       Repo already cloned — pulling latest..."
    git pull origin main
else
    # Repo is private — token is passed in via environment variable
    # Usage: GITHUB_TOKEN=ghp_xxx bash setup-vps.sh
    if [ -z "$GITHUB_TOKEN" ]; then
        echo ""
        echo "ERROR: GITHUB_TOKEN is not set."
        echo "Run the script like this instead:"
        echo "  GITHUB_TOKEN=your_token bash setup-vps.sh"
        echo ""
        echo "Your token is at: https://github.com/settings/tokens"
        exit 1
    fi
    git clone "https://${GITHUB_TOKEN}@github.com/tms2283/nexus.git" . 2>&1 | tail -1
fi
echo "       Code ready."

# ── 7. Write .env ────────────────────────────────────────────
echo "[7/10] Writing .env..."
cat > $APP_DIR/.env <<ENV
NODE_ENV=production
PORT=3000
VITE_APP_ID=nexus

DATABASE_URL=mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}

JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

OAUTH_SERVER_URL=
OWNER_OPEN_ID=

AUDIO_DIR=${APP_DIR}/public/audio
AUDIO_URL_BASE=https://${DOMAIN}/audio
RESEARCH_SERVICE_URL=http://localhost:8001/api
ENV
mkdir -p $APP_DIR/public/audio
echo "       .env written."

# ── 8. Install deps and build ────────────────────────────────
echo "[8/10] Installing dependencies (this takes ~2 min)..."
cd $APP_DIR
pnpm install --frozen-lockfile 2>&1 | tail -3

echo "       Building..."
pnpm run build 2>&1 | tail -3

echo "       Running migrations..."
node scripts/migrate-v4.mjs 2>&1 | tail -5
echo "       Build complete."

# ── 9. Start with PM2 ────────────────────────────────────────
echo "[9/10] Starting Nexus with PM2..."
mkdir -p /var/log/nexus
pm2 delete nexus 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root 2>&1 | tail -2
systemctl enable pm2-root 2>/dev/null || true

sleep 3
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo "       App is running on port 3000."
else
    echo "       WARNING: App may not be responding yet. Check: pm2 logs nexus"
fi

# ── 10. Configure Nginx ──────────────────────────────────────
echo "[10/10] Configuring Nginx..."
cat > /etc/nginx/sites-available/nexus <<NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90;
    }

    location /public/audio/ {
        alias ${APP_DIR}/public/audio/;
        expires 7d;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/nexus
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "================================================"
echo "  Setup complete!"
echo ""
echo "  App running at:  http://$(hostname -I | awk '{print $1}')"
echo ""
echo "  Next steps:"
echo "  1. Point your domain DNS A record to this IP:"
echo "     $(hostname -I | awk '{print $1}')"
echo ""
echo "  2. Once DNS propagates, get a free SSL cert:"
echo "     apt-get install -y certbot python3-certbot-nginx"
echo "     certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
echo "  Useful commands:"
echo "     pm2 logs nexus       (view live logs)"
echo "     pm2 restart nexus    (restart app)"
echo "     pm2 status           (check status)"
echo "================================================"
