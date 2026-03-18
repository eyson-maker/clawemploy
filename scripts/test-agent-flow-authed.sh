#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

printf '%b\n' "${BLUE}========================================${NC}"
printf '%b\n' "${BLUE}Agent Flow Authenticated Test Guide${NC}"
printf '%b\n' "${BLUE}========================================${NC}"
printf '%s\n' 'This script prints the manual curl steps for exercising the full'
printf '%s\n' 'agent lifecycle with a valid browser session cookie and webhook token.'
printf '%s\n' "Base URL: ${BASE_URL}"
printf '\n'

cat <<EOF
1. Get a valid session cookie
   - Log into the local app in your browser.
   - Open DevTools.
   - In the Network tab, click an authenticated request and copy the full Cookie header.
   - Or use Application/Storage -> Cookies -> http://localhost:3000 and copy the session cookie pair(s).
   - Paste that value into SESSION_COOKIE below.

2. Fill in these placeholders before running the commands manually
   export BASE_URL='${BASE_URL}'
   export SESSION_COOKIE='better-auth-session-or-full-cookie-header-here'
   export AGENT_ID='replace-with-agent-id-from-provision-response'
   export WEBHOOK_AGENT_ID='replace-with-openclawAgentId-from-provision-response'
   export WEBHOOK_TOKEN='replace-with-webhook-token-from-db-or-logs'

3. Provision agent
   curl -i -X POST "${BASE_URL}/api/agents/provision" \
     -H 'Content-Type: application/json' \
     -H "Cookie: \$SESSION_COOKIE" \
     --data '{"name":"Local Test Agent","plan":"starter","channel":"telegram"}'
   Expected: HTTP 200 with JSON containing success=true, agentId, openclawAgentId, workspacePath, status=active.

4. Check health
   curl -i -X GET "${BASE_URL}/api/agents/\$AGENT_ID/health" \
     -H "Cookie: \$SESSION_COOKIE"
   Expected: HTTP 200 with JSON health details for the agent.

5. Sleep agent
   curl -i -X POST "${BASE_URL}/api/agents/\$AGENT_ID/sleep" \
     -H "Cookie: \$SESSION_COOKIE"
   Expected: HTTP 200 with JSON containing success=true and status=sleeping.

6. Wake agent
   curl -i -X POST "${BASE_URL}/api/agents/\$AGENT_ID/wake" \
     -H "Cookie: \$SESSION_COOKIE"
   Expected: HTTP 200 with JSON containing success=true and status=active.

7. Terminate agent
   curl -i -X POST "${BASE_URL}/api/agents/\$AGENT_ID/terminate" \
     -H "Cookie: \$SESSION_COOKIE"
   Expected: HTTP 200 with JSON containing success=true and status=terminated.

8. Send webhook with valid token
   curl -i -X POST "${BASE_URL}/api/webhooks/agent-task" \
     -H 'Content-Type: application/json' \
     -H "X-Agent-Token: \$WEBHOOK_TOKEN" \
     --data '{"agent_id":"'"\$WEBHOOK_AGENT_ID"'","task_description":"Manual webhook verification","engine":"claude","status":"completed"}'
   Expected: HTTP 200 with JSON containing success=true and remainingCredits.

Notes
   - Run the webhook step before terminate if you want it to match an active instance.
   - If an endpoint returns 401, re-check the Cookie header value.
   - If the webhook returns 401, re-check WEBHOOK_TOKEN and WEBHOOK_AGENT_ID against the stored agent record.
EOF

printf '\n'
printf '%b\n' "${GREEN}Guide ready.${NC} Fill in the placeholders and run the curl commands manually."
