# Nexus — Deployment Guide (Hostinger VPS)

## Prerequisites

- Hostinger KVM2 VPS (Ubuntu 22.04, 2 vCPU, 8GB RAM minimum)
- A domain pointed to your VPS IP in Hostinger DNS
- SSH access to the VPS
- A GitHub account with this repo pushed to it

---

## 1. Initial VPS Setup

```bash
# Connect to your VPS
ssh root@YOUR_VPS_IP

# Create a non-root deploy user
adduser deploy
usermod -aG sudo deploy
# Copy your SSH key to the deploy user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Harden SSH (optional but recommended)
nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no, PermitRootLogin no
systemctl restart sshd

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 2. Install Dependencies

```bash
# Node.js (via nvm for easy version management)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# PM2
npm install -g pm2

# Python 3.11 + venv
sudo apt install -y python3.11 python3.11-venv python3-pip

# MySQL 8
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Nginx
sudo apt install -y nginx

# Certbot (Let's Encrypt SSL)
sudo apt install -y certbot python3-certbot-nginx

# Git
sudo apt install -y git
```

---

## 3. MySQL Setup

```bash
sudo mysql
```

```sql
CREATE DATABASE nexus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nexus_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON nexus.* TO 'nexus_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 4. Clone & Configure Nexus

```bash
# Clone the repository
sudo mkdir -p /var/www/nexus
sudo chown deploy:deploy /var/www/nexus
cd /var/www/nexus
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Create .env from template
cp .env.example .env
nano .env
# Fill in: DATABASE_URL, JWT_SECRET, ELEVENLABS_API_KEY, EXA_API_KEY, etc.

# Create audio output directory
sudo mkdir -p /var/www/nexus/public/audio
sudo chown deploy:deploy /var/www/nexus/public/audio

# Create PM2 log directory
sudo mkdir -p /var/log/nexus
sudo chown deploy:deploy /var/log/nexus

# Install dependencies and build
pnpm install --frozen-lockfile
pnpm build

# Run database migrations (in order)
node scripts/migrate-v4.mjs
node scripts/migrate-v5.mjs
node scripts/migrate-v6.mjs   # adaptive lesson assessment + reflection tables
```

---

## 5. Deploy Python Research Service

```bash
# Clone research engine
sudo mkdir -p /var/www/nexus-research
sudo chown deploy:deploy /var/www/nexus-research
cd /var/www/nexus-research
git clone https://github.com/YOUR_USERNAME/schmoco-research-engine.git .

# Create Python virtual environment
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure .env
cp .env.example .env
nano .env
# Set: OPENAI_API_KEY, EXA_API_KEY

# Install systemd service
sudo cp /var/www/nexus/deploy/nexus-research.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nexus-research
sudo systemctl start nexus-research
sudo systemctl status nexus-research
```

---

## 6. Nginx Configuration

```bash
# Copy config and update domain name
sudo cp /var/www/nexus/deploy/nginx.conf /etc/nginx/sites-available/nexus
sudo nano /etc/nginx/sites-available/nexus
# Replace: yourdomain.com → your actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow the prompts; choose to redirect HTTP to HTTPS

# Verify auto-renewal
sudo certbot renew --dry-run
```

---

## 7. Start Node.js App with PM2

```bash
cd /var/www/nexus
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
# Run the command it outputs (starts PM2 on reboot)
```

---

## 8. Set Up GitHub Actions CI/CD

In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Contents of `~/.ssh/id_rsa` (your private key) |

Push to `main` branch to trigger the first deployment.

---

## 9. Set Up Daily Backups

```bash
sudo cp /var/www/nexus/deploy/backup.sh /usr/local/bin/nexus-backup
sudo chmod +x /usr/local/bin/nexus-backup

# Add to cron (runs at 2am daily)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/nexus-backup >> /var/log/nexus-backup.log 2>&1") | crontab -
```

---

## 10. Verify Everything Works

```bash
# Check Node.js app
pm2 status
curl http://localhost:3000/api/trpc/system.health

# Check Python service
systemctl status nexus-research
curl http://localhost:8001/health

# Check Nginx
sudo systemctl status nginx
curl -I https://yourdomain.com

# Check SSL certificate
sudo certbot certificates
```

---

## Useful Commands

```bash
# View app logs
pm2 logs nexus

# Restart app
pm2 restart nexus

# Restart Python service
sudo systemctl restart nexus-research

# Manual deploy (if GitHub Actions fails)
cd /var/www/nexus && git pull && pnpm install && pnpm build && pm2 reload nexus

# Check disk usage
df -h

# Check memory
free -h
```
