#!/bin/bash

# =================================================================
# CLIMB SSL Initialization Script
# Usage: ./init_ssl.sh <your-domain> <your-email>
# =================================================================

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: ./init_ssl.sh <domain> <email>"
    exit 1
fi

echo "Requesting SSL certificate for $DOMAIN..."

# Berpindah ke folder backend tempat docker-compose.yml berada
cd "$(dirname "$0")/../../backend"

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL --agree-tos --no-eff-email \
    -d $DOMAIN" certbot

echo "Reloading Nginx to apply certificates..."
docker compose exec nginx nginx -s reload

echo "SSL Setup for $DOMAIN complete!"
