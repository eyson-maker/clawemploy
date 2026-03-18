#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

pass_count=0
fail_count=0

print_header() {
  printf '%b\n' "${BLUE}========================================${NC}"
  printf '%b\n' "${BLUE}Agent Flow Local Verification${NC}"
  printf '%b\n' "${BLUE}========================================${NC}"
  printf '%s\n' 'This script checks the unauthenticated and webhook-guarded parts'
  printf '%s\n' 'of the local agent lifecycle against a running Next.js dev server.'
  printf '%s\n' "Base URL: ${BASE_URL}"
  printf '\n'
}

run_check() {
  local label="$1"
  local expected_status="$2"
  local method="$3"
  local endpoint="$4"
  local data="${5:-}"
  shift 5 || true

  local response_file
  response_file="$(mktemp)"
  local status=''

  if [ -n "$data" ]; then
    status="$(curl -sS -o "$response_file" -w '%{http_code}' -X "$method" "$BASE_URL$endpoint" "$@" --data "$data")"
  else
    status="$(curl -sS -o "$response_file" -w '%{http_code}' -X "$method" "$BASE_URL$endpoint" "$@")"
  fi

  if [ "$status" = "$expected_status" ]; then
    pass_count=$((pass_count + 1))
    printf '%b\n' "${GREEN}PASS${NC} ${label} -> ${status}"
  else
    fail_count=$((fail_count + 1))
    printf '%b\n' "${RED}FAIL${NC} ${label} -> expected ${expected_status}, got ${status}"
    if [ -s "$response_file" ]; then
      printf '%s\n' 'Response body:'
      cat "$response_file"
      printf '\n'
    fi
  fi

  rm -f "$response_file"
}

print_summary() {
  local total
  total=$((pass_count + fail_count))

  printf '\n'
  printf '%b\n' "${BLUE}Summary${NC}"
  printf '%s\n' "Total checks: ${total}"
  printf '%b\n' "${GREEN}Passed: ${pass_count}${NC}"
  printf '%b\n' "${RED}Failed: ${fail_count}${NC}"

  if [ "$fail_count" -gt 0 ]; then
    exit 1
  fi
}

print_header

valid_webhook_body='{"agent_id":"agent-test","task_description":"Local webhook test","engine":"claude","status":"completed"}'
invalid_webhook_body='{}'
invalid_token='invalid-agent-token'

run_check \
  'POST /api/agents/provision without auth cookie' \
  '401' \
  'POST' \
  '/api/agents/provision' \
  '{"name":"Test Agent","plan":"starter","channel":"telegram"}' \
  -H 'Content-Type: application/json'

run_check \
  'POST /api/webhooks/agent-task without X-Agent-Token' \
  '401' \
  'POST' \
  '/api/webhooks/agent-task' \
  "$valid_webhook_body" \
  -H 'Content-Type: application/json'

run_check \
  'POST /api/webhooks/agent-task with invalid token' \
  '401' \
  'POST' \
  '/api/webhooks/agent-task' \
  "$valid_webhook_body" \
  -H 'Content-Type: application/json' \
  -H "X-Agent-Token: ${invalid_token}"

run_check \
  'POST /api/webhooks/agent-task with invalid body' \
  '400' \
  'POST' \
  '/api/webhooks/agent-task' \
  "$invalid_webhook_body" \
  -H 'Content-Type: application/json'

run_check \
  'GET /api/agents/nonexistent/health without auth cookie' \
  '401' \
  'GET' \
  '/api/agents/nonexistent/health' \
  ''

print_summary
