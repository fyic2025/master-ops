# Tasks To Complete - Buy Organics Online Category Setup

## Status: PAUSED - Waiting for Migration

### What's Done
- [x] Category sync infrastructure created
- [x] SQL migration files written
- [x] TypeScript sync script ready
- [x] Curl backup script ready
- [x] Credentials table SQL prepared
- [x] All files committed to git

### What Needs To Be Done (In Order)

#### Task 1: Apply Credentials Table (Optional but Recommended)
**Time:** 2 minutes

1. Open: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new
2. Copy contents of: `/home/user/master-ops/CREDENTIALS-SETUP.sql`
3. Paste and click "Run"
4. Go to Table Editor > `credentials` and add any missing values for Elevate/Teelixir

#### Task 2: Apply Category Tables Migration (REQUIRED)
**Time:** 2 minutes

1. Open: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new
2. Copy contents of: `/home/user/master-ops/buy-organics-online/CATEGORY-SETUP-QUICK.sql`
3. Paste and click "Run"
4. Should see: "Category tables and views created successfully!"

#### Task 3: Run Category Sync
**Time:** ~5 minutes

```bash
cd /home/user/master-ops/buy-organics-online
npx tsx sync-categories-to-supabase.ts
```

Or if Node has issues:
```bash
./sync-categories-curl.sh
```

#### Task 4: Verify Results
Check in Supabase Table Editor:
- `bc_categories` should have ~839 rows
- `product_category_links` should have ~25,000+ rows

Run analysis queries:
```sql
-- Category statistics
SELECT * FROM v_category_stats;

-- Empty categories (potential redundancy)
SELECT * FROM v_low_product_categories WHERE product_status = 'empty';

-- Content gaps
SELECT * FROM v_category_content_gaps LIMIT 20;
```

---

## File Locations

| File | Purpose |
|------|---------|
| `buy-organics-online/CATEGORY-SETUP-QUICK.sql` | Migration SQL for category tables |
| `buy-organics-online/sync-categories-to-supabase.ts` | Main sync script |
| `buy-organics-online/sync-categories-curl.sh` | Backup sync script |
| `buy-organics-online/CATEGORY-SYNC-README.md` | Full documentation |
| `CREDENTIALS-SETUP.sql` | Credentials table + BOO credentials |
| `CREDENTIALS-SUMMARY-3-PROJECTS.md` | What credentials exist/missing |

---

## Expected Outcome

After completing these tasks:
1. **839 categories** from BigCommerce stored in Supabase
2. **Product-category relationships** mapped (which products in which categories)
3. **Product counts** per category calculated
4. **Analysis views** ready to query for:
   - Redundant/empty categories
   - Content gaps (missing descriptions)
   - Orphaned products
   - Category hierarchy

This sets up the foundation to review and optimize category structure.
