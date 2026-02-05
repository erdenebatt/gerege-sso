#!/bin/bash
# SSL Certificate Initialization Script
# Run this after initial deployment to get Let's Encrypt certificate

set -e

DOMAIN="sso.gerege.mn"
EMAIL="admin@gerege.mn"

echo "Initializing SSL for $DOMAIN..."

# Stop nginx if running
docker-compose stop nginx 2>/dev/null || true

# Create directories
mkdir -p certbot/conf certbot/www

# Get certificate
docker run -it --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Start nginx
docker-compose up -d nginx

echo "SSL certificate installed successfully!"
echo "Certificate location: certbot/conf/live/$DOMAIN/"
