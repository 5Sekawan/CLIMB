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

# Create dummy certificate to allow Nginx to start if needed
# (Or ensure Nginx is running with the challenge location open)

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL --agree-tos --no-eff-email \
    -d $DOMAIN" certbot

echo "Reloading Nginx to apply certificates..."
docker compose exec nginx nginx -s reload

echo "SSL Setup for $DOMAIN complete!"
