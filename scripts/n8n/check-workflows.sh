#!/bin/bash
# Check n8n workflows for errors

SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s"

# Get n8n API key from vault
ENC_VALUE=$(curl -sk "https://usibnysqelovfuctmkqw.supabase.co/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" | jq -r '.[0].encrypted_value')

# Decrypt it - key is SHA256 hash of passphrase, IV is first 16 bytes
KEY_HEX=$(echo -n 'mstr-ops-vault-2024-secure-key' | openssl dgst -sha256 | awk '{print $NF}')
DECODED=$(echo "$ENC_VALUE" | base64 -d)
IV_HEX=$(echo "$DECODED" | head -c 16 | xxd -p | tr -d '\n')
CIPHERTEXT=$(echo "$DECODED" | tail -c +17 | xxd -p | tr -d '\n')
N8N_KEY=$(echo "$CIPHERTEXT" | xxd -r -p | openssl enc -aes-256-cbc -d -K "$KEY_HEX" -iv "$IV_HEX" 2>/dev/null)

echo "Got n8n API key: ${N8N_KEY:0:10}..."

# Active workflows to check
WORKFLOWS=(
  "34mwUAzIzd0vWcK6"
  "4cGCmsd0h8r6giD8"
  "8Sq4dp3eD0KfR9TS"
  "BZU7YiMydr0YNSCP"
  "C1ZEjrnPZMzazFRW"
)

BATCH=${1:-1}
START=$(( (BATCH-1) * 5 ))

echo ""
echo "=== Batch $BATCH: Workflows $((START+1))-$((START+5)) ==="
echo ""

for i in $(seq 0 4); do
  IDX=$((START + i))
  WF_ID="${WORKFLOWS[$IDX]}"

  if [ -z "$WF_ID" ]; then
    continue
  fi

  # Get workflow details
  WF_JSON=$(curl -sk "https://automation.growthcohq.com/api/v1/workflows/$WF_ID" -H "X-N8N-API-KEY: $N8N_KEY")
  WF_NAME=$(echo "$WF_JSON" | jq -r '.name // "Unknown"')
  WF_ACTIVE=$(echo "$WF_JSON" | jq -r '.active // false')

  echo "📋 $WF_NAME"
  echo "   ID: $WF_ID"
  echo "   Active: $WF_ACTIVE"

  # Get recent error executions
  ERRORS=$(curl -sk "https://automation.growthcohq.com/api/v1/executions?workflowId=$WF_ID&limit=5&status=error" -H "X-N8N-API-KEY: $N8N_KEY")
  ERROR_COUNT=$(echo "$ERRORS" | jq '.data | length')

  if [ "$ERROR_COUNT" -gt 0 ] 2>/dev/null; then
    echo "   ❌ Recent errors: $ERROR_COUNT"
    echo "$ERRORS" | jq -r '.data[0:2][] | "      - \(.startedAt[0:19])"'
  else
    # Check for successful runs
    SUCCESS=$(curl -sk "https://automation.growthcohq.com/api/v1/executions?workflowId=$WF_ID&limit=1" -H "X-N8N-API-KEY: $N8N_KEY")
    LAST_RUN=$(echo "$SUCCESS" | jq -r '.data[0].startedAt[0:19] // "never"')
    echo "   ✅ No recent errors. Last run: $LAST_RUN"
  fi

  # Get credentials used
  CREDS=$(echo "$WF_JSON" | jq -r '[.nodes[]?.credentials? | keys[]?] | unique | join(", ")')
  if [ -n "$CREDS" ]; then
    echo "   Credentials: $CREDS"
  fi

  echo ""
done
