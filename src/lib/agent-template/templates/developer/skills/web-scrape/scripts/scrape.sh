#!/bin/bash
# Web scrape via scrapling HTTP proxy
set -euo pipefail

URL="${1:?Usage: scrape.sh URL [format] [mode] [css]}"
FORMAT="${2:-markdown}"
MODE="${3:-get}"
CSS="${4:-}"

# Build JSON payload
JSON="{\"url\":\"$URL\",\"mode\":\"$MODE\",\"format\":\"$FORMAT\""
if [ -n "$CSS" ]; then
    JSON="$JSON,\"css\":\"$CSS\""
fi
JSON="$JSON}"

# Call scrapling proxy (local service, port 8050)
RESPONSE=$(curl -s --max-time 120 -X POST http://127.0.0.1:8050/scrape \
  -H "Content-Type: application/json" \
  -d "$JSON" 2>&1)

# Check for curl failure
if [ $? -ne 0 ]; then
    echo "Error: Failed to reach scrapling proxy at 127.0.0.1:8050"
    echo "$RESPONSE"
    exit 1
fi

# Extract content from JSON response using python
echo "$RESPONSE" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    if d.get('error'):
        print(f'Error: {d[\"error\"]}')
        sys.exit(1)
    print(d.get('content', ''))
except json.JSONDecodeError:
    print('Error: Invalid response from scrapling proxy')
    sys.exit(1)
"
