# Pending Tasks - Master Ops

**Last Updated:** 2025-11-25

This file tracks tasks that require manual completion. When you pull this repo and ask Claude for pending tasks, these will be flagged.

---

## 🔴 HIGH PRIORITY

### 1. Buy Organics Online - Complete BigCommerce Product Attributes Migration

**Status:** PENDING USER ACTION
**Created:** 2025-11-25
**Branch:** `claude/complete-product-attributes-01KZnwdRh9RWAcrN9nU12euC`
**Project:** `buy-organics-online`

**Background:**
The Supabase `ecommerce_products` table currently has 10,431 products but only captures 27 of the ~70+ available BigCommerce product fields. A migration has been created to add 47 new columns to capture ALL product attributes including variants, options, modifiers, videos, SEO fields, and more.

**Files Created:**
- `buy-organics-online/supabase-migrations/005_expand_product_attributes.sql` - Migration SQL
- `buy-organics-online/sync-bc-to-supabase-v2.ts` - Updated sync script with complete field mapping
- `buy-organics-online/check-supabase-products.ts` - Helper to verify data
- `buy-organics-online/run-migration-005.ts` - Migration verification script

**Action Required:**

1. **Run the migration in Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new
   - Copy contents from: `buy-organics-online/supabase-migrations/005_expand_product_attributes.sql`
   - Click "Run"

2. **Re-sync all products with complete data:**
   ```bash
   cd buy-organics-online
   npm install
   npx tsx sync-bc-to-supabase-v2.ts
   ```

**New Fields Being Added (47 total):**
- SEO: `description`, `page_title`, `meta_description`, `meta_keywords`, `search_keywords`
- Product Type: `type`, `condition`, `is_condition_shown`
- Pricing: `map_price`, `calculated_price`, `is_price_hidden`, `price_hidden_label`
- Tax: `tax_class_id`, `product_tax_code`
- Inventory: `inventory_tracking`, `inventory_warning_level`
- Shipping: `is_free_shipping`, `fixed_cost_shipping_price`
- Ordering: `order_quantity_minimum`, `order_quantity_maximum`, `sort_order`, `is_featured`
- Preorder: `is_preorder_only`, `preorder_release_date`, `preorder_message`
- Statistics: `view_count`, `reviews_rating_sum`, `reviews_count`, `total_sold`
- Open Graph: All OG meta fields for social sharing
- Sub-resources: `variants`, `options`, `modifiers`, `videos`, `bulk_pricing_rules`

**Estimated Time:** 15-30 minutes

---

## 🟡 MEDIUM PRIORITY

*(No medium priority tasks at this time)*

---

## 🟢 LOW PRIORITY

*(No low priority tasks at this time)*

---

## ✅ Completed Tasks

*(Move tasks here when done)*

---

## How to Use This File

1. When you pull the repo, ask Claude: "What pending tasks need to be completed?"
2. Claude will check this file and flag any outstanding items
3. After completing a task, move it to the "Completed Tasks" section with the completion date
4. Add new pending tasks as needed following the format above

---

*This file is auto-updated by Claude when tasks are identified that require manual action.*
