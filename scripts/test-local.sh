#!/bin/bash
# =============================================================================
# Gerege SSO - Local Test Runner
# =============================================================================
# Starts local Docker containers, runs unit tests inside the backend container,
# then runs integration tests against /health and /ready endpoints.
# Cleans up database state after test run.
#
# Usage: ./scripts/test-local.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.local.yml"
ENV_FILE="$PROJECT_DIR/.env.local"
COMPOSE_CMD="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE -p gerege-test"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASSED=0
FAILED=0

log()   { echo -e "${CYAN}[test]${NC} $1"; }
ok()    { echo -e "${GREEN}[PASS]${NC} $1"; PASSED=$((PASSED + 1)); }
fail()  { echo -e "${RED}[FAIL]${NC} $1"; FAILED=$((FAILED + 1)); }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }

# =============================================================================
# Cleanup handler — always runs on exit
# =============================================================================
cleanup() {
    log "Cleaning up test containers..."
    $COMPOSE_CMD down -v --remove-orphans 2>/dev/null || true
    log "Cleanup complete."
}
trap cleanup EXIT

# =============================================================================
# Phase 1: Start infrastructure
# =============================================================================
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN} Gerege SSO — Local Test Suite${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

log "Starting postgres and redis..."
$COMPOSE_CMD up -d postgres redis

log "Waiting for postgres to be healthy..."
RETRIES=30
until $COMPOSE_CMD exec -T postgres pg_isready -U grgdev -d gerege_sso >/dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
        fail "Postgres did not become healthy in time"
        exit 1
    fi
    sleep 1
done
ok "Postgres is healthy"

log "Waiting for redis to be healthy..."
RETRIES=15
until $COMPOSE_CMD exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
        fail "Redis did not become healthy in time"
        exit 1
    fi
    sleep 1
done
ok "Redis is healthy"

# =============================================================================
# Phase 2: Run Go unit tests inside a builder container
# =============================================================================
echo ""
log "Running Go unit tests..."

# Build a temporary test container from the dev stage
$COMPOSE_CMD build backend >/dev/null 2>&1

# Run tests using a one-off container connected to the test network
docker run --rm \
    --network gerege-test_gerege-local \
    -e POSTGRES_HOST=postgres \
    -e POSTGRES_PORT=5432 \
    -e POSTGRES_USER=grgdev \
    -e POSTGRES_PASSWORD=localdev123 \
    -e POSTGRES_DB=gerege_sso \
    -e REDIS_HOST=redis \
    -e REDIS_PORT=6379 \
    -v "$PROJECT_DIR/backend":/app \
    -w /app \
    golang:1.24-alpine sh -c "apk add --no-cache git >/dev/null 2>&1 && go test ./... -v -count=1" 2>&1

TEST_EXIT=$?
if [ $TEST_EXIT -eq 0 ]; then
    ok "All Go unit tests passed"
else
    fail "Go unit tests failed (exit code: $TEST_EXIT)"
fi

# =============================================================================
# Phase 3: Start backend and run integration tests
# =============================================================================
echo ""
log "Starting backend for integration tests..."
$COMPOSE_CMD up -d backend

log "Waiting for backend to be ready..."
RETRIES=30
BACKEND_URL="http://localhost:8080"
until curl -sf "$BACKEND_URL/health" >/dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
        fail "Backend did not start in time"
        warn "Backend logs:"
        $COMPOSE_CMD logs backend --tail 30
        exit 1
    fi
    sleep 1
done
ok "Backend is running"

# --- /health endpoint ---
log "Testing GET /health ..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
if [ "$HTTP_CODE" = "200" ]; then
    ok "/health returned 200"
else
    fail "/health returned $HTTP_CODE (expected 200)"
fi

# --- /ready endpoint ---
log "Testing GET /ready ..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/ready")
if [ "$HTTP_CODE" = "200" ]; then
    ok "/ready returned 200"
else
    fail "/ready returned $HTTP_CODE (expected 200)"
fi

# --- /metrics endpoint ---
log "Testing GET /metrics ..."
METRICS_BODY=$(curl -sf "$BACKEND_URL/metrics" 2>/dev/null || echo "FETCH_FAILED")
if echo "$METRICS_BODY" | grep -q "identity_verification_total"; then
    ok "/metrics contains identity_verification_total"
else
    fail "/metrics missing identity_verification_total counter"
fi

# =============================================================================
# Phase 4: Clean up test database state
# =============================================================================
echo ""
log "Cleaning up test database state..."
$COMPOSE_CMD exec -T postgres psql -U grgdev -d gerege_sso -c "
    DELETE FROM audit_logs;
    DELETE FROM sessions;
    DELETE FROM users;
" >/dev/null 2>&1 && ok "Database test state cleaned" || warn "Database cleanup skipped (no test data)"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${CYAN}============================================${NC}"
TOTAL=$((PASSED + FAILED))
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN} ALL $TOTAL CHECKS PASSED${NC}"
else
    echo -e "${RED} $FAILED/$TOTAL CHECKS FAILED${NC}"
fi
echo -e "${CYAN}============================================${NC}"
echo ""

# Exit with failure if any check failed
[ $FAILED -eq 0 ] || exit 1
