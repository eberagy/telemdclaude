#!/usr/bin/env bash
# ============================================================
# smoke_test.sh — Basic smoke tests for TeleMD + AgentOps
# ============================================================
set -euo pipefail

TELEMD_URL="${TELEMD_URL:-http://localhost:3001}"
AGENTOPS_URL="${AGENTOPS_URL:-http://localhost:4000}"
AGENTOPS_UI_URL="${AGENTOPS_UI_URL:-http://localhost:4001}"

PASS=0
FAIL=0

check() {
  local label="$1"
  local url="$2"
  local expected_status="${3:-200}"

  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" || echo "000")

  if [[ "$status" == "$expected_status" || "$status" == "200" || "$status" == "302" ]]; then
    echo "  ✓ $label ($status)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $label — expected $expected_status, got $status"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "============================================"
echo " TeleMD + AgentOps Smoke Tests"
echo "============================================"
echo ""

echo "TeleMD API (${TELEMD_URL}):"
check "Health/root" "${TELEMD_URL}/" 200
check "Appointments API" "${TELEMD_URL}/api/appointments" 401  # Should require auth
check "Stripe webhook" "${TELEMD_URL}/api/webhooks/stripe" 400  # No payload
check "Retell webhook" "${TELEMD_URL}/api/webhooks/retell" 200

echo ""
echo "AgentOps API (${AGENTOPS_URL}):"
check "Approvals list" "${AGENTOPS_URL}/api/approvals" 401  # Should require auth
check "Queue list" "${AGENTOPS_URL}/api/queue" 401
check "Runs list" "${AGENTOPS_URL}/api/runs" 401

echo ""
echo "AgentOps UI (${AGENTOPS_UI_URL}):"
check "Dashboard" "${AGENTOPS_UI_URL}/" 200
check "Approvals page" "${AGENTOPS_UI_URL}/approvals" 200

echo ""
echo "============================================"
echo " Results: ${PASS} passed, ${FAIL} failed"
echo "============================================"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
