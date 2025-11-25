#!/bin/bash

# Apply Category Schema Migration to Supabase using Management API
# This script uses the Supabase Management API to execute SQL

SUPABASE_PROJECT_REF="usibnysqelovfuctmkqw"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s"

echo "=== Buy Organics Online - Category Schema Migration ==="
echo ""
echo "This migration requires running SQL directly in the Supabase Dashboard."
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Open Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/sql/new"
echo ""
echo "2. Copy the SQL from:"
echo "   /home/user/master-ops/buy-organics-online/supabase-migrations/005_create_category_tables.sql"
echo ""
echo "3. Paste into the SQL Editor and click 'Run'"
echo ""
echo "4. After migration completes, run:"
echo "   npx tsx sync-categories-to-supabase.ts"
echo ""
echo "=== Checking current status ==="

# Check if bc_categories exists
result=$(curl -s "https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/bc_categories?select=id&limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

if echo "$result" | grep -q "does not exist"; then
  echo "bc_categories: NOT EXISTS (needs migration)"
else
  count=$(curl -s "https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/bc_categories?select=id" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Prefer: count=exact" \
    -H "Range: 0-0" -I 2>/dev/null | grep -i "content-range" | sed 's/.*\///')
  echo "bc_categories: EXISTS (${count:-0} rows)"
fi

# Check if product_category_links exists
result=$(curl -s "https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/product_category_links?select=id&limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

if echo "$result" | grep -q "does not exist"; then
  echo "product_category_links: NOT EXISTS (needs migration)"
else
  echo "product_category_links: EXISTS"
fi

# Check if category_analysis exists
result=$(curl -s "https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/category_analysis?select=id&limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

if echo "$result" | grep -q "does not exist"; then
  echo "category_analysis: NOT EXISTS (needs migration)"
else
  echo "category_analysis: EXISTS"
fi

echo ""
