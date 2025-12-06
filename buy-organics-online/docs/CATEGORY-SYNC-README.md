# Buy Organics Online - Category Sync Setup

## Overview

This sets up BigCommerce category pages in Supabase with:
- **839 categories** from BigCommerce with all fields
- Product-category relationships (which products are in which categories)
- Product counts per category
- Analysis views for finding redundant categories and content gaps

## Tables Created

| Table | Purpose |
|-------|---------|
| `bc_categories` | All BigCommerce category pages with full details |
| `product_category_links` | Many-to-many relationship between products and categories |
| `category_analysis` | Store analysis results and recommendations |

## Analysis Views Created

| View | Purpose |
|------|---------|
| `v_category_overview` | All categories with hierarchy and content quality ratings |
| `v_low_product_categories` | Categories with few products (potential redundancy) |
| `v_category_content_gaps` | Categories missing descriptions/SEO content |
| `v_product_categories` | Products with their category assignments |
| `v_orphaned_products` | Products with no category assigned |
| `v_category_stats` | Overall statistics summary |

## Setup Instructions

### Step 1: Apply Migration (One-time)

1. Open Supabase Dashboard SQL Editor:
   https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new

2. Copy and paste the contents of:
   `CATEGORY-SETUP-QUICK.sql`

3. Click "Run"

### Step 2: Sync Categories

**Option A: TypeScript (Recommended)**
```bash
cd /home/user/master-ops/buy-organics-online
npx tsx sync-categories-to-supabase.ts
```

**Option B: Bash/Curl (Alternative)**
```bash
cd /home/user/master-ops/buy-organics-online
./sync-categories-curl.sh
```

### Step 3: Verify

After sync completes, check the data in Supabase:
- Table Editor: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/editor
- Select `bc_categories` to see all categories
- Select `product_category_links` to see product-category relationships

## Using the Analysis Views

### Find Empty/Low Product Categories
```sql
SELECT * FROM v_low_product_categories ORDER BY product_count;
```

### Find Categories Missing Content
```sql
SELECT * FROM v_category_content_gaps WHERE missing_description = true;
```

### Get Category Statistics
```sql
SELECT * FROM v_category_stats;
```

### Find Products Without Categories
```sql
SELECT * FROM v_orphaned_products;
```

### See All Products in a Category
```sql
SELECT * FROM v_product_categories WHERE category_name = 'Body Care';
```

## Files Created

| File | Description |
|------|-------------|
| `CATEGORY-SETUP-QUICK.sql` | Quick SQL migration to run in Supabase |
| `supabase-migrations/005_create_category_tables.sql` | Full migration with all indexes |
| `sync-categories-to-supabase.ts` | TypeScript sync script |
| `sync-categories-curl.sh` | Bash/curl sync script (backup) |

## Data Structure

### bc_categories columns:
- `bc_category_id` - BigCommerce category ID
- `name` - Category name
- `description` - Category page description (SEO content)
- `parent_id` - Parent category ID (0 = root)
- `tree_depth` - Depth in hierarchy (0 = root level)
- `category_path` - Full path like "Food > Snacks > Bars"
- `category_path_ids` - Array of category IDs in the path
- `product_count` - Number of products in this category
- `page_title` - SEO page title
- `meta_description` - SEO meta description
- `custom_url` - URL structure {url: "/path/", is_customized: bool}
- `image_url` - Category image
- `is_visible` - Whether visible on storefront
- `raw_data` - Complete BigCommerce API response

### product_category_links columns:
- `bc_product_id` - Links to bc_products.bc_product_id
- `bc_category_id` - Links to bc_categories.bc_category_id
- `is_primary_category` - Whether this is the product's main category

## Expected Results After Sync

- ~839 categories synced
- ~25,000+ product-category links created
- Product counts updated on all categories
- Analysis views ready for querying
