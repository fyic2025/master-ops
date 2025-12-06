#!/bin/bash

# =============================================================================
# Buy Organics Online - Category Sync via Curl
# =============================================================================
# This script:
# 1. Fetches all categories from BigCommerce
# 2. Syncs them to Supabase bc_categories table
# 3. Populates product-category links from bc_products.categories
# 4. Updates product counts
#
# Run: chmod +x sync-categories-curl.sh && ./sync-categories-curl.sh
# =============================================================================

set -e

# Configuration
BC_STORE_HASH="hhhi"
BC_ACCESS_TOKEN="d9y2srla3treynpbtmp4f3u1bomdna2"

SUPABASE_URL="https://usibnysqelovfuctmkqw.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s"

TEMP_DIR="/tmp/boo-category-sync"
mkdir -p "$TEMP_DIR"

echo "=============================================="
echo "Buy Organics Online - Category Sync"
echo "=============================================="
echo ""

# Check if bc_categories table exists
echo "Checking if bc_categories table exists..."
TABLE_CHECK=$(curl -s "${SUPABASE_URL}/rest/v1/bc_categories?select=id&limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

if echo "$TABLE_CHECK" | grep -q "does not exist"; then
  echo ""
  echo "ERROR: bc_categories table does not exist!"
  echo ""
  echo "Please run the migration first:"
  echo "1. Open: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new"
  echo "2. Paste contents of: supabase-migrations/005_create_category_tables.sql"
  echo "3. Click 'Run'"
  echo ""
  exit 1
fi

echo "Table exists. Starting sync..."
echo ""

# Function to upsert category to Supabase
upsert_category() {
  local json="$1"
  curl -s -X POST "${SUPABASE_URL}/rest/v1/bc_categories" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "$json" > /dev/null
}

# Fetch all categories from BigCommerce
echo "Fetching categories from BigCommerce..."
PAGE=1
TOTAL_PAGES=1
ALL_CATEGORIES="$TEMP_DIR/all_categories.json"
echo "[]" > "$ALL_CATEGORIES"

while [ $PAGE -le $TOTAL_PAGES ]; do
  echo "  Fetching page $PAGE..."

  RESPONSE=$(curl -s "https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v3/catalog/categories?limit=250&page=${PAGE}" \
    -H "X-Auth-Token: ${BC_ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

  # Extract categories and pagination info
  echo "$RESPONSE" > "$TEMP_DIR/page_${PAGE}.json"

  TOTAL_PAGES=$(echo "$RESPONSE" | jq -r '.meta.pagination.total_pages')
  COUNT=$(echo "$RESPONSE" | jq -r '.meta.pagination.count')
  TOTAL=$(echo "$RESPONSE" | jq -r '.meta.pagination.total')

  echo "    Fetched $COUNT categories (Total: $TOTAL)"

  # Merge with all categories
  jq -s '.[0] + .[1].data' "$ALL_CATEGORIES" "$TEMP_DIR/page_${PAGE}.json" > "$TEMP_DIR/merged.json"
  mv "$TEMP_DIR/merged.json" "$ALL_CATEGORIES"

  PAGE=$((PAGE + 1))
  sleep 0.2
done

TOTAL_CATEGORIES=$(jq 'length' "$ALL_CATEGORIES")
echo ""
echo "Fetched $TOTAL_CATEGORIES categories total"
echo ""

# Build category map for path calculation
echo "Building category hierarchy..."
declare -A CATEGORY_NAMES
declare -A CATEGORY_PARENTS

while IFS= read -r line; do
  id=$(echo "$line" | jq -r '.id')
  name=$(echo "$line" | jq -r '.name')
  parent=$(echo "$line" | jq -r '.parent_id')
  CATEGORY_NAMES[$id]="$name"
  CATEGORY_PARENTS[$id]="$parent"
done < <(jq -c '.[]' "$ALL_CATEGORIES")

# Function to build category path
build_path() {
  local id=$1
  local depth=0
  local path=""
  local path_ids=""
  local current=$id
  local paths=""

  while [ "$current" != "0" ] && [ -n "${CATEGORY_NAMES[$current]}" ]; do
    if [ -z "$paths" ]; then
      paths="${CATEGORY_NAMES[$current]}"
    else
      paths="${CATEGORY_NAMES[$current]} > $paths"
    fi

    if [ -z "$path_ids" ]; then
      path_ids="$current"
    else
      path_ids="$current,$path_ids"
    fi

    parent="${CATEGORY_PARENTS[$current]}"
    if [ "$parent" != "0" ]; then
      depth=$((depth + 1))
    fi
    current="$parent"
  done

  echo "$depth|$paths|$path_ids"
}

# Sync categories to Supabase
echo "Syncing categories to Supabase..."
SYNCED=0
ERRORS=0

while IFS= read -r category; do
  id=$(echo "$category" | jq -r '.id')

  # Build path info
  path_info=$(build_path "$id")
  tree_depth=$(echo "$path_info" | cut -d'|' -f1)
  category_path=$(echo "$path_info" | cut -d'|' -f2)
  path_ids=$(echo "$path_info" | cut -d'|' -f3)

  # Convert path_ids to array format
  path_ids_array="[$(echo "$path_ids" | tr ',' ',')]"

  # Build Supabase record
  record=$(echo "$category" | jq --arg path "$category_path" --argjson depth "$tree_depth" --argjson pids "[$path_ids]" '{
    bc_category_id: .id,
    name: .name,
    description: .description,
    parent_id: .parent_id,
    tree_depth: $depth,
    sort_order: (.sort_order // 0),
    custom_url: .custom_url,
    page_title: .page_title,
    meta_keywords: (.meta_keywords // []),
    meta_description: .meta_description,
    search_keywords: .search_keywords,
    image_url: .image_url,
    is_visible: (.is_visible // true),
    default_product_sort: .default_product_sort,
    layout_file: .layout_file,
    views: (.views // 0),
    category_path: $path,
    category_path_ids: $pids,
    raw_data: .,
    is_active: true,
    synced_at: (now | todate)
  }')

  # Upsert to Supabase
  RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${SUPABASE_URL}/rest/v1/bc_categories" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "$record")

  if [ "$RESULT" = "201" ] || [ "$RESULT" = "200" ]; then
    SYNCED=$((SYNCED + 1))
  else
    ERRORS=$((ERRORS + 1))
  fi

  # Progress indicator
  if [ $((SYNCED % 50)) -eq 0 ]; then
    echo "  Synced $SYNCED categories..."
  fi

done < <(jq -c '.[]' "$ALL_CATEGORIES")

echo ""
echo "Categories synced: $SYNCED"
echo "Errors: $ERRORS"
echo ""

# Populate product-category links
echo "Populating product-category links..."
echo "(This reads categories from bc_products and creates links)"

# Fetch products with their categories
OFFSET=0
LIMIT=500
TOTAL_LINKS=0

while true; do
  PRODUCTS=$(curl -s "${SUPABASE_URL}/rest/v1/bc_products?select=bc_product_id,categories&offset=${OFFSET}&limit=${LIMIT}" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

  PRODUCT_COUNT=$(echo "$PRODUCTS" | jq 'length')

  if [ "$PRODUCT_COUNT" = "0" ]; then
    break
  fi

  echo "  Processing products $OFFSET to $((OFFSET + PRODUCT_COUNT))..."

  # Build links for each product
  while IFS= read -r product; do
    product_id=$(echo "$product" | jq -r '.bc_product_id')
    categories=$(echo "$product" | jq -r '.categories // []')

    if [ "$categories" != "null" ] && [ "$categories" != "[]" ]; then
      # Extract category IDs and create links
      is_first=true
      for cat_id in $(echo "$categories" | jq -r '.[]'); do
        if [ -n "$cat_id" ] && [ "$cat_id" != "null" ]; then
          is_primary="false"
          if [ "$is_first" = "true" ]; then
            is_primary="true"
            is_first=false
          fi

          link_record="{\"bc_product_id\": $product_id, \"bc_category_id\": $cat_id, \"is_primary_category\": $is_primary}"

          curl -s -o /dev/null -X POST "${SUPABASE_URL}/rest/v1/product_category_links" \
            -H "apikey: ${SUPABASE_SERVICE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
            -H "Content-Type: application/json" \
            -H "Prefer: resolution=merge-duplicates" \
            -d "$link_record"

          TOTAL_LINKS=$((TOTAL_LINKS + 1))
        fi
      done
    fi
  done < <(echo "$PRODUCTS" | jq -c '.[]')

  OFFSET=$((OFFSET + LIMIT))

  if [ "$PRODUCT_COUNT" -lt "$LIMIT" ]; then
    break
  fi
done

echo ""
echo "Product-category links created: $TOTAL_LINKS"
echo ""

# Update product counts on categories
echo "Updating category product counts..."

# Get counts per category
COUNTS=$(curl -s "${SUPABASE_URL}/rest/v1/product_category_links?select=bc_category_id" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

# Count occurrences
declare -A CAT_COUNTS
while IFS= read -r link; do
  cat_id=$(echo "$link" | jq -r '.bc_category_id')
  if [ -n "$cat_id" ] && [ "$cat_id" != "null" ]; then
    current=${CAT_COUNTS[$cat_id]:-0}
    CAT_COUNTS[$cat_id]=$((current + 1))
  fi
done < <(echo "$COUNTS" | jq -c '.[]')

# Update each category's count
UPDATED=0
for cat_id in "${!CAT_COUNTS[@]}"; do
  count=${CAT_COUNTS[$cat_id]}
  curl -s -o /dev/null -X PATCH "${SUPABASE_URL}/rest/v1/bc_categories?bc_category_id=eq.${cat_id}" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"product_count\": $count}"
  UPDATED=$((UPDATED + 1))
done

echo "Updated $UPDATED category product counts"
echo ""

# Generate summary report
echo "=============================================="
echo "SYNC COMPLETE - SUMMARY"
echo "=============================================="

# Get final counts
CAT_COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/bc_categories?select=id" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Prefer: count=exact" | jq 'length')

LINK_COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/product_category_links?select=id" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Prefer: count=exact" | jq 'length')

echo ""
echo "Final counts:"
echo "  Categories: $CAT_COUNT"
echo "  Product-Category Links: $LINK_COUNT"
echo ""

# Get some stats
echo "Category Statistics:"

EMPTY_COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/bc_categories?product_count=eq.0&select=id" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" | jq 'length')

ROOT_COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/bc_categories?parent_id=eq.0&select=id" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" | jq 'length')

echo "  Root categories: $ROOT_COUNT"
echo "  Empty categories (0 products): $EMPTY_COUNT"
echo ""

# Top categories by product count
echo "Top 10 Categories by Product Count:"
curl -s "${SUPABASE_URL}/rest/v1/bc_categories?select=name,product_count,category_path&order=product_count.desc&limit=10" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" | jq -r '.[] | "  \(.product_count) - \(.name)"'

echo ""
echo "=============================================="
echo "Done! Categories are now synced to Supabase."
echo "=============================================="

# Cleanup
rm -rf "$TEMP_DIR"
