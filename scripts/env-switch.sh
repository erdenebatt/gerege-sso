#!/bin/bash
# ===========================================
# Gerege SSO - Environment Switcher
# ===========================================
# Usage: ./scripts/env-switch.sh [dev|prod]
# ===========================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "$1" in
  dev|development)
    cp "$PROJECT_ROOT/.env.development" "$PROJECT_ROOT/.env"
    echo "✅ Switched to DEVELOPMENT environment"
    echo "   - Google OAuth: localhost:8080"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend: http://localhost:8080"
    ;;
  prod|production)
    cp "$PROJECT_ROOT/.env.production" "$PROJECT_ROOT/.env"
    echo "✅ Switched to PRODUCTION environment"
    echo "   - Google OAuth: sso.gerege.mn"
    echo "   - Frontend: https://sso.gerege.mn"
    echo "   - Backend: https://sso.gerege.mn/api"
    ;;
  status|current)
    if grep -q "localhost" "$PROJECT_ROOT/.env" 2>/dev/null; then
      echo "📍 Current environment: DEVELOPMENT"
    else
      echo "📍 Current environment: PRODUCTION"
    fi
    ;;
  *)
    echo "Usage: $0 [dev|prod|status]"
    echo ""
    echo "Commands:"
    echo "  dev, development  - Switch to local development"
    echo "  prod, production  - Switch to production (sso.gerege.mn)"
    echo "  status, current   - Show current environment"
    exit 1
    ;;
esac
