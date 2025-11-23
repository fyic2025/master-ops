# Quick Start - Sync BC Products to Supabase

## Step 1: Create Tables in Supabase (2 minutes)

1. Open: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new
2. Copy: c:\Users\jayso\master-ops\buy-organics-online\run-all-migrations.sql
3. Paste into SQL Editor
4. Click "Run"

## Step 2: Sync Products (5-10 minutes)

Run:
```
cd "c:\Users\jayso\master-ops\buy-organics-online"
npx tsx sync-bc-to-supabase.ts
```

This syncs all ~11,357 BigCommerce products to Supabase.
