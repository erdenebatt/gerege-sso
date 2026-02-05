#!/bin/bash
# Gerege SSO Deployment Script
# Run this on the target VM after copying the project files

set -e

echo "========================================"
echo "Gerege SSO - Deployment Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Variables
APP_DIR="/app/gerege-sso"
DOMAIN="sso.gerege.mn"

echo -e "\n${YELLOW}Step 1: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    apt-get update
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

echo -e "\n${YELLOW}Step 2: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed successfully${NC}"
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

echo -e "\n${YELLOW}Step 3: Creating application directory...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR
echo -e "${GREEN}Directory created: $APP_DIR${NC}"

echo -e "\n${YELLOW}Step 4: Creating required directories...${NC}"
mkdir -p certbot/conf certbot/www
echo -e "${GREEN}Directories created${NC}"

echo -e "\n${YELLOW}Step 5: Starting services (without SSL initially)...${NC}"
# First start without nginx for SSL certificate generation
docker-compose up -d postgres redis
echo "Waiting for database to be ready..."
sleep 10

echo -e "\n${YELLOW}Step 6: Building and starting backend...${NC}"
docker-compose up -d --build backend frontend

echo -e "\n${YELLOW}Step 7: Generating SSL certificate...${NC}"
# Create a temporary nginx config for certbot
docker-compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@gerege.mn \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN || {
    echo -e "${YELLOW}Using self-signed certificate for testing${NC}"
    mkdir -p certbot/conf/live/$DOMAIN
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout certbot/conf/live/$DOMAIN/privkey.pem \
        -out certbot/conf/live/$DOMAIN/fullchain.pem \
        -subj "/CN=$DOMAIN"
}

echo -e "\n${YELLOW}Step 8: Starting all services...${NC}"
docker-compose up -d

echo -e "\n${YELLOW}Step 9: Waiting for services to be healthy...${NC}"
sleep 15

echo -e "\n${YELLOW}Step 10: Checking service status...${NC}"
docker-compose ps

echo -e "\n${GREEN}========================================"
echo "Deployment Complete!"
echo "========================================"
echo -e "Website: https://$DOMAIN"
echo -e "Grafana: https://$DOMAIN/grafana"
echo -e "Health:  https://$DOMAIN/health"
echo -e "${NC}"

echo -e "\nUseful commands:"
echo "  View logs:       docker-compose logs -f"
echo "  Restart:         docker-compose restart"
echo "  Stop:            docker-compose down"
echo "  View containers: docker-compose ps"
