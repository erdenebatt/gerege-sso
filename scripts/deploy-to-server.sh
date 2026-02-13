#!/bin/bash
# =============================================================================
# Gerege SSO - Deploy to Production Server
# =============================================================================
# 1. Runs local tests. Aborts if any test fails.
# 2. SSH into server, git pull, docker compose rebuild.
# 3. Verifies the deployment via /health check.
# 4. Prints a success/failure notification.
#
# Usage: ./scripts/deploy-to-server.sh
#    or: SSH_KEY=~/.ssh/my_key SERVER_USER=myuser ./scripts/deploy-to-server.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# =============================================================================
# Configuration (override via environment variables)
# =============================================================================
SSH_KEY="${SSH_KEY:-$HOME/.ssh/google_compute_engine}"
SERVER_USER="${SERVER_USER:-erdenebatt}"
SERVER_IP="${SERVER_IP:-35.247.182.183}"
SERVER_APP_DIR="${SERVER_APP_DIR:-/app/gerege-sso}"
DOMAIN="${DOMAIN:-sso.gerege.mn}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[deploy]${NC} $1"; }
ok()   { echo -e "${GREEN}[  OK  ]${NC} $1"; }
fail() { echo -e "${RED}[ FAIL ]${NC} $1"; }
warn() { echo -e "${YELLOW}[ WARN ]${NC} $1"; }

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN} Gerege SSO — Production Deployment${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# =============================================================================
# Pre-flight checks
# =============================================================================
log "Checking SSH key..."
if [ ! -f "$SSH_KEY" ]; then
    fail "SSH key not found: $SSH_KEY"
    echo "  Set SSH_KEY environment variable to your key path."
    exit 1
fi
ok "SSH key found: $SSH_KEY"

log "Testing SSH connectivity..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" "echo ok" >/dev/null 2>&1; then
    fail "Cannot connect to $SERVER_USER@$SERVER_IP"
    echo "  Verify SSH key permissions and server availability."
    exit 1
fi
ok "SSH connection verified"

# =============================================================================
# Step 1: Run local tests
# =============================================================================
echo ""
log "Running local test suite..."
if "$SCRIPT_DIR/test-local.sh"; then
    ok "All local tests passed"
else
    fail "Local tests failed — aborting deployment"
    exit 1
fi

# =============================================================================
# Step 2: Push to GitHub
# =============================================================================
echo ""
log "Pushing to GitHub..."
if git -C "$PROJECT_DIR" diff --quiet && git -C "$PROJECT_DIR" diff --cached --quiet; then
    log "No uncommitted changes, pushing existing commits..."
else
    warn "Uncommitted changes detected — commit before deploying."
    exit 1
fi

if git -C "$PROJECT_DIR" push origin main 2>&1; then
    ok "Code pushed to GitHub"
else
    fail "Failed to push to GitHub — aborting deployment"
    exit 1
fi

# =============================================================================
# Step 3: Deploy to server
# =============================================================================
echo ""
log "Deploying to $SERVER_USER@$SERVER_IP..."

ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" bash -s <<REMOTE_SCRIPT
    set -e

    echo "[remote] Navigating to $SERVER_APP_DIR..."
    cd $SERVER_APP_DIR

    echo "[remote] Pulling latest changes..."
    git pull origin main

    echo "[remote] Rebuilding and restarting containers..."
    docker compose up -d --build backend frontend

    echo "[remote] Waiting for backend to be healthy..."
    RETRIES=30
    until docker compose exec -T backend wget -qO- http://localhost:8080/health >/dev/null 2>&1; do
        RETRIES=\$((RETRIES - 1))
        if [ \$RETRIES -le 0 ]; then
            echo "[remote] ERROR: Backend health check failed after rebuild"
            docker compose logs backend --tail 20
            exit 1
        fi
        sleep 2
    done
    echo "[remote] Backend is healthy"

    echo "[remote] Cleaning up old images and build cache..."
    docker image prune -f 2>/dev/null || true
    docker builder prune -f --keep-storage=500MB 2>/dev/null || true
    DISK_USAGE=\$(df -h / | awk 'NR==2 {print \$5}')
    echo "[remote] Disk usage after cleanup: \$DISK_USAGE"

    echo "[remote] Container status:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}"
REMOTE_SCRIPT

DEPLOY_EXIT=$?

# =============================================================================
# Step 4: Verify production endpoint
# =============================================================================
echo ""
if [ $DEPLOY_EXIT -eq 0 ]; then
    log "Verifying production endpoint..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://$DOMAIN/health" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        ok "Production health check passed (https://$DOMAIN/health → 200)"
    else
        warn "Production health check returned $HTTP_CODE (may need a moment to propagate)"
    fi
fi

# =============================================================================
# Step 5: Notification
# =============================================================================
echo ""
echo -e "${CYAN}================================================${NC}"
if [ $DEPLOY_EXIT -eq 0 ]; then
    echo -e "${GREEN} DEPLOYMENT SUCCESSFUL${NC}"
    echo -e "${GREEN} https://$DOMAIN${NC}"
    echo -e "${GREEN} $(date '+%Y-%m-%d %H:%M:%S %Z')${NC}"
else
    echo -e "${RED} DEPLOYMENT FAILED${NC}"
    echo -e "${RED} Check server logs: ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP${NC}"
    echo -e "${RED} docker compose logs backend --tail 50${NC}"
fi
echo -e "${CYAN}================================================${NC}"
echo ""

exit $DEPLOY_EXIT
