#!/usr/bin/env bash
# =============================================================
# DK3 Construction — DigitalOcean droplet one-shot setup
# Ubuntu 22.04/24.04. Run as root:  bash droplet-setup.sh
#
# What it does:
#   1. Installs nginx + certbot + unzip + git
#   2. Creates the web root at /var/www/dk3
#   3. Configures nginx (gzip, cache headers, HTTP ranges for the
#      scroll video, security headers)
#   4. If DOMAIN is set and DNS already points here, provisions
#      free HTTPS via Let's Encrypt
#
# Getting the site files onto the droplet (pick ONE):
#   A) From your Mac:   scp dk3-website.zip root@YOUR_DROPLET_IP:/root/
#      then here:       unzip -o /root/dk3-website.zip -d /var/www/dk3
#   B) From GitHub:     GIT_URL="https://<TOKEN>@github.com/christianhillman15-afk/hi.git"
#      (create a fine-grained token with read access to the repo)
# =============================================================
set -euo pipefail

DOMAIN="${DOMAIN:-}"            # e.g.  DOMAIN=dk3llc.com bash droplet-setup.sh
EMAIL="${EMAIL:-admin@dk3llc.com}"
GIT_URL="${GIT_URL:-}"          # optional: token-auth’d repo URL to pull the site from
GIT_BRANCH="${GIT_BRANCH:-claude/dk3llc-professional-website-4jav33}"
WEBROOT=/var/www/dk3

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx unzip git certbot python3-certbot-nginx

mkdir -p "$WEBROOT"

# --- optionally pull the site from GitHub -------------------------------
if [ -n "$GIT_URL" ]; then
  rm -rf /tmp/dk3src
  git clone --depth 1 --branch "$GIT_BRANCH" "$GIT_URL" /tmp/dk3src
  rsync -a --delete \
    --exclude '.git' --exclude 'deploy' \
    --exclude 'assets/build-sequence/frame_*.jpg' \
    --exclude 'assets/build-sequence/*.md' \
    /tmp/dk3src/ "$WEBROOT"/
  echo "✔ site synced from $GIT_BRANCH"
fi

# --- nginx site ---------------------------------------------------------
cat > /etc/nginx/sites-available/dk3 <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN:-_} ${DOMAIN:+www.$DOMAIN};

    root $WEBROOT;
    index index.html;

    # security
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # compression (text assets; video is already compressed)
    gzip on;
    gzip_types text/css application/javascript image/svg+xml application/json text/plain application/xml;
    gzip_min_length 1024;

    # long cache for static assets; HTML always fresh
    location ~* \.(css|js|svg|jpg|jpeg|png|webp|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    # the scroll-build video: cacheable + HTTP ranges (nginx serves ranges natively)
    location ~* \.(mp4|webm)$ {
        expires 30d;
        add_header Cache-Control "public";
        add_header Accept-Ranges bytes;
    }
    location / {
        try_files \$uri \$uri/ =404;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/dk3 /etc/nginx/sites-enabled/dk3
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "✔ nginx serving $WEBROOT on port 80"

# --- HTTPS (needs DNS A record for the domain pointing at this droplet) --
if [ -n "$DOMAIN" ]; then
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
    --non-interactive --agree-tos -m "$EMAIL" --redirect || {
      echo "⚠ certbot failed — most likely DNS for $DOMAIN doesn't point here yet."
      echo "  Point an A record at this droplet's IP, then re-run:"
      echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect -m $EMAIL --agree-tos -n"
    }
fi

IP=$(curl -s -4 ifconfig.me || hostname -I | awk '{print $1}')
echo ""
echo "======================================================"
echo "  DK3 site is live:  http://${DOMAIN:-$IP}"
[ -z "$GIT_URL" ] && echo "  (web root is $WEBROOT — unzip the site there if you haven't)"
echo "======================================================"
